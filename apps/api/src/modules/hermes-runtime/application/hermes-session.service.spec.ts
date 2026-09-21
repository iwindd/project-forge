import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../../common/errors/application-error.js';
import type { HermesGatewayEvent } from '../domain/hermes-runtime.types.js';
import { HermesSessionService, projectHermesEvent } from './hermes-session.service.js';
import type { HermesSessionRepositoryPort } from './ports/hermes-session.repository.js';
import type { HermesSessionRecord } from '../domain/hermes-session.types.js';

const userId = '550e8400-e29b-41d4-a716-446655440000';
const otherUserId = '660e8400-e29b-41d4-a716-446655440000';
const sessionId = '770e8400-e29b-41d4-a716-446655440000';
const createdAt = new Date('2026-09-20T10:00:00.000Z');

const record: HermesSessionRecord = {
  id: sessionId,
  userId,
  agentHandle: 'lyla',
  hermesSessionId: 'stored-session-1',
  createdAt,
  updatedAt: createdAt,
  closedAt: null,
};

function makeRuntime() {
  const listeners = new Set<(event: HermesGatewayEvent) => void>();
  return {
    request: vi.fn(async (method: string) => {
      if (method === 'session.create') {
        return {
          session_id: 'live-session-1',
          stored_session_id: 'stored-session-1',
          message_count: 0,
          messages: [],
          info: { title: '', model: 'gpt-5.6-luna', provider: 'openai-codex', cwd: 'D:/secret/workspace' },
        };
      }
      if (method === 'session.list') {
        return {
          sessions: [
            {
              id: 'stored-session-1',
              title: 'การสนทนาแรก',
              preview: 'สรุปงานล่าสุด',
              started_at: 1_758_347_200,
              message_count: 2,
              is_active: true,
            },
          ],
        };
      }
      if (method === 'session.active_list') {
        return {
          sessions: [
            {
              current: true,
              id: 'live-session-1',
              last_active: 1_758_347_200,
              message_count: 2,
              model: 'gpt-5.6-luna',
              preview: 'สรุปงานล่าสุด',
              session_key: 'stored-session-1',
              started_at: 1_758_347_200,
              status: 'idle',
              title: 'การสนทนาแรก',
            },
          ],
        };
      }
      if (method === 'session.resume') {
        return {
          session_id: 'live-session-1',
          stored_session_id: 'stored-session-1',
          message_count: 1,
          messages: [{ role: 'user', text: 'สวัสดี', row_id: 1, timestamp: 1_758_347_200 }],
          info: {
            title: 'การสนทนาแรก',
            model: 'gpt-5.6-luna',
            provider: 'openai-codex',
            cwd: 'D:/secret/workspace',
            system_prompt: 'secret prompt',
          },
          status: 'idle',
          inflight: null,
        };
      }
      return { title: 'ชื่อใหม่', closed: true };
    }),
    onEvent: vi.fn((listener: (event: HermesGatewayEvent) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
  };
}

function makeRepository(overrides: Partial<HermesSessionRepositoryPort> = {}) {
  return {
    listForUser: vi.fn(async () => [record]),
    findByIdForUser: vi.fn(async (ownerId: string) => (ownerId === userId ? record : null)),
    create: vi.fn(async (_value: HermesSessionRecord) => undefined),
    replaceRuntimeSession: vi.fn(async () => undefined),
    markOpened: vi.fn(async () => undefined),
    markClosed: vi.fn(async () => undefined),
    ...overrides,
  } satisfies HermesSessionRepositoryPort;
}

const readyAgents = {
  execute: vi.fn(async () => ({
    agents: [
      {
        handle: 'lyla',
        displayName: 'Lyla',
        description: '',
        isDefault: true,
        model: 'gpt-5.6-luna',
        provider: 'openai-codex',
        skillCount: 1,
        hasAvatar: false,
        readiness: 'ready' as const,
        message: 'Ready to use',
        action: 'use' as const,
      },
    ],
    runtime: { state: 'ready' as const, message: 'Hermes is ready', action: null },
    permissions: { canConfigure: false },
    refreshedAt: '2026-09-20T10:00:00.000Z',
  })),
};

describe('HermesSessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a native session with the selected shared Agent and default Hermes working directory', async () => {
    const runtime = makeRuntime();
    const repository = makeRepository();
    const service = new HermesSessionService(runtime, repository, readyAgents);

    const result = await service.create(userId, 'lyla');

    expect(runtime.request).toHaveBeenCalledWith('session.create', {
      profile: 'lyla',
      source: 'project-forge',
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId, agentHandle: 'lyla', hermesSessionId: 'stored-session-1' }),
    );
    expect(result).toMatchObject({
      record: { id: expect.any(String), agentHandle: 'lyla' },
      snapshot: { sessionId: expect.any(String), messages: [], status: 'idle' },
    });
  });

  it('lists only safe projections of the authenticated User sessions', async () => {
    const runtime = makeRuntime();
    const repository = makeRepository();
    const service = new HermesSessionService(runtime, repository, readyAgents);

    const result = await service.list(userId);

    expect(repository.listForUser).toHaveBeenCalledWith(userId);
    expect(runtime.request).toHaveBeenCalledWith('session.list', {
      profile: 'lyla',
      include_hidden: true,
      limit: 200,
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: sessionId,
        agentHandle: 'lyla',
        title: 'การสนทนาแรก',
        preview: 'สรุปงานล่าสุด',
        messageCount: 2,
        active: true,
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain('cwd');
  });

  it('batches Session summaries per Agent instead of repeating full runtime lists per Session', async () => {
    const runtime = makeRuntime();
    const secondRecord: HermesSessionRecord = {
      ...record,
      id: '880e8400-e29b-41d4-a716-446655440000',
      hermesSessionId: 'stored-session-2',
      createdAt: new Date('2026-09-20T11:00:00.000Z'),
      updatedAt: new Date('2026-09-20T11:00:00.000Z'),
    };
    const repository = makeRepository({ listForUser: vi.fn(async () => [record, secondRecord]) });
    const service = new HermesSessionService(runtime, repository, readyAgents);

    const result = await service.list(userId);

    expect(result).toHaveLength(2);
    expect(runtime.request.mock.calls.filter(([method]) => method === 'session.list')).toHaveLength(1);
    expect(runtime.request.mock.calls.filter(([method]) => method === 'session.active_list')).toHaveLength(1);
  });

  it('rejects a session that is not owned by the authenticated User before touching Hermes', async () => {
    const runtime = makeRuntime();
    const repository = makeRepository();
    const service = new HermesSessionService(runtime, repository, readyAgents);

    await expect(service.attach(otherUserId, sessionId)).rejects.toBeInstanceOf(NotFoundError);
    expect(runtime.request).not.toHaveBeenCalled();
  });

  it('resumes a native session and returns transcript-safe data without runtime paths or prompts', async () => {
    const runtime = makeRuntime();
    const repository = makeRepository();
    const service = new HermesSessionService(runtime, repository, readyAgents);

    const result = await service.attach(userId, sessionId);

    expect(runtime.request).toHaveBeenCalledWith('session.resume', {
      profile: 'lyla',
      session_id: 'stored-session-1',
    });
    expect(result.runtimeSessionId).toBe('live-session-1');
    expect(result.snapshot).toMatchObject({
      sessionId,
      title: 'การสนทนาแรก',
      messages: [{ role: 'user', text: 'สวัสดี', rowId: 1 }],
      status: 'idle',
    });
    expect(JSON.stringify(result)).not.toContain('secret prompt');
    expect(JSON.stringify(result)).not.toContain('D:/secret/workspace');
    expect(result.snapshot).not.toHaveProperty('hermesSessionId');
  });

  it('reattaches a newly created empty Session without asking Hermes to resume an unpersisted draft', async () => {
    const runtime = makeRuntime();
    const repository = makeRepository();
    const service = new HermesSessionService(runtime, repository, readyAgents);

    const created = await service.create(userId, 'lyla');
    vi.mocked(repository.findByIdForUser).mockResolvedValue(created.record);
    runtime.request.mockClear();

    const attached = await service.attach(userId, created.record.id);

    expect(runtime.request).not.toHaveBeenCalled();
    expect(attached.runtimeSessionId).toBe('live-session-1');
    expect(attached.snapshot).toMatchObject({ sessionId: created.record.id, messages: [], status: 'idle' });
  });

  it('recreates an empty draft when its native runtime disappeared before the first prompt', async () => {
    const runtime = makeRuntime();
    const repository = makeRepository();
    const service = new HermesSessionService(runtime, repository, readyAgents);
    runtime.request.mockImplementation(async (method: string) => {
      if (method === 'session.resume') throw Object.assign(new Error('session not found'), { rpcCode: 4007 });
      return {
        session_id: 'replacement-live-session',
        stored_session_id: 'replacement-stored-session',
        message_count: 0,
        messages: [],
        info: { title: '', model: 'gpt-5.6-luna', provider: 'openai-codex', cwd: 'D:/workspace' },
        status: 'idle',
        inflight: null,
      } as unknown as Awaited<ReturnType<typeof runtime.request>>;
    });

    const attached = await service.attach(userId, sessionId);

    expect(runtime.request).toHaveBeenNthCalledWith(1, 'session.resume', {
      profile: 'lyla',
      session_id: 'stored-session-1',
    });
    expect(runtime.request).toHaveBeenNthCalledWith(2, 'session.create', {
      profile: 'lyla',
      source: 'project-forge',
    });
    expect(repository.replaceRuntimeSession).toHaveBeenCalledWith(
      userId,
      sessionId,
      'replacement-stored-session',
      expect.any(Date),
    );
    expect(attached.runtimeSessionId).toBe('replacement-live-session');
  });

  it('renames and closes through native Session methods while keeping the local reference', async () => {
    const runtime = makeRuntime();
    const repository = makeRepository();
    const service = new HermesSessionService(runtime, repository, readyAgents);

    await service.rename(userId, sessionId, 'ชื่อใหม่');
    await service.close(userId, sessionId);

    expect(runtime.request).toHaveBeenCalledWith('session.title', {
      profile: 'lyla',
      session_id: 'live-session-1',
      title: 'ชื่อใหม่',
    });
    expect(runtime.request).toHaveBeenCalledWith('session.close', {
      profile: 'lyla',
      session_id: 'live-session-1',
    });
    expect(repository.markClosed).toHaveBeenCalledWith(userId, sessionId, expect.any(Date));
  });
});

describe('projectHermesEvent', () => {
  it('projects native runtime errors into a retryable browser-safe frame', () => {
    expect(
      projectHermesEvent(
        { type: 'error', sessionId: 'live-session-1', payload: { message: 'provider unavailable', internalValue: '[REDACTED]' } },
        sessionId,
      ),
    ).toEqual({
      type: 'error',
      code: 'MESSAGE_FAILED',
      sessionId,
      message: 'provider unavailable',
    });
  });
});
