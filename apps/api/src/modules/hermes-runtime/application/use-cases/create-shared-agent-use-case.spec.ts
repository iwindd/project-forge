import { describe, expect, it, vi } from 'vitest';
import type { AuditLogPort } from '../../../../common/audit/audit.port.js';
import { ConflictError } from '../../../../common/errors/application-error.js';
import type { HermesRuntimeService } from '../hermes-runtime.service.js';
import type { HermesRuntimeStatus } from '../../domain/hermes-runtime.types.js';
import { ListSharedAgentsUseCase } from './list-shared-agents-use-case.js';
import { CreateSharedAgentUseCase, type CreateSharedAgentInput } from './create-shared-agent-use-case.js';

const readyStatus: HermesRuntimeStatus = {
  state: 'ready',
  endpoint: { host: '127.0.0.1', port: 9119, path: '/api/ws', managed: true },
  version: '0.21.3',
  capabilities: ['profiles.create', 'profiles.configure'],
  backendEpoch: 'epoch-1',
  serverRequests: 'advertised',
  checkedAt: '2026-09-20T00:00:00.000Z',
  message: 'Hermes is ready',
  action: null,
};

const input: CreateSharedAgentInput = {
  handle: 'builder',
  displayName: 'Builder',
  description: 'Shared implementation Agent',
  role: 'Implementer',
  personality: 'You are a careful implementation assistant.',
  provider: 'openai-codex',
  model: 'gpt-5.6-luna',
  skills: ['skill-a'],
  toolsets: ['coding'],
  confirmExpensiveModel: false,
  avatar: null,
};

const describedProfile = {
  name: 'builder',
  description: input.description,
  soul: input.personality,
  model: { provider: input.provider, default: input.model },
  skills: [
    { name: 'skill-a', enabled: true },
    { name: 'skill-b', enabled: false },
  ],
  toolsets: [{ name: 'coding', label: 'Coding', description: 'Coding tools', tool_count: 4, enabled: true }],
  toolsets_pinned: true,
  mcp_servers: [],
};

function profileList() {
  return {
    profiles: [
      {
        name: 'builder',
        is_default: false,
        model: input.model,
        provider: input.provider,
        description: input.description,
        display_name: input.displayName,
        skill_count: 1,
        ui_meta: {
          display_name: input.displayName,
          role: input.role,
        },
      },
    ],
  };
}

function runtime(request: unknown): HermesRuntimeService {
  return {
    request: request as HermesRuntimeService['request'],
    getStatus: () => readyStatus,
  } as unknown as HermesRuntimeService;
}

describe('CreateSharedAgentUseCase', () => {
  it('creates, configures, reads back, audits, and returns a ready shared Agent', async () => {
    let listCalls = 0;
    const request = vi.fn(async (method: string, _params?: unknown) => {
      if (method === 'model.options') {
        return { providers: [{ slug: input.provider, name: 'OpenAI Codex', models: [input.model] }] };
      }
      if (method === 'profiles.list') {
        listCalls += 1;
        return listCalls === 1 ? { profiles: [] } : profileList();
      }
      if (method === 'profiles.create') {
        return { ok: true, name: input.handle, path: 'must-not-leak', mirrored: {} };
      }
      if (method === 'profiles.describe') return describedProfile;
      if (method === 'profiles.configure') {
        return {
          ok: true,
          applied: {
            ui_meta: true,
            soul: true,
            description: true,
            model: true,
            skills: true,
            toolsets: true,
          },
        };
      }
      if (method === 'setup.runtime_check') return { ok: true };
      throw new Error(`unexpected Hermes method ${method}`);
    });
    const audit: AuditLogPort = { record: vi.fn(async () => undefined) };
    const listSharedAgents = new ListSharedAgentsUseCase(runtime(request));
    const useCase = new CreateSharedAgentUseCase(runtime(request), audit, listSharedAgents);

    const result = await useCase.execute({ input, actorId: 'admin-id', requestId: 'request-1' });

    expect(result.status).toBe('ready');
    expect(result.agent).toMatchObject({ handle: 'builder', readiness: 'ready', action: 'use' });
    expect(result.sections).toMatchObject({
      identity: { status: 'applied' },
      personality: { status: 'applied' },
      model: { status: 'applied' },
      skills: { status: 'applied' },
      toolsets: { status: 'applied' },
      avatar: { status: 'skipped' },
      readback: { status: 'applied' },
      runtime: { status: 'applied' },
    });
    expect(request).toHaveBeenCalledWith(
      'profiles.create',
      expect.objectContaining({
        name: 'builder',
        description: input.description,
        soul: input.personality,
        model: input.model,
        provider: input.provider,
        mirror_credentials: true,
      }),
    );
    expect(request).toHaveBeenCalledWith(
      'profiles.configure',
      expect.objectContaining({
        name: 'builder',
        description: input.description,
        soul: input.personality,
        model: input.model,
        provider: input.provider,
        enabled_toolsets: ['coding'],
        disabled_skills: ['skill-b'],
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-id',
        action: 'SHARED_AGENT_CREATED',
        resourceType: 'SHARED_LOCAL_AGENT',
        resourceId: 'builder',
        requestId: 'request-1',
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-id',
        action: 'SHARED_AGENT_CONFIGURED',
        resourceType: 'SHARED_LOCAL_AGENT',
        resourceId: 'builder',
        requestId: 'request-1',
        after: expect.objectContaining({ status: 'ready' }),
      }),
    );
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
  });

  it('reports partial configuration without falsely marking the Agent ready', async () => {
    let listCalls = 0;
    let confirmed = false;
    const request = vi.fn(async (method: string, params?: unknown) => {
      if (method === 'model.options') {
        return { providers: [{ slug: input.provider, name: 'OpenAI Codex', models: [input.model] }] };
      }
      if (method === 'profiles.list') {
        listCalls += 1;
        return listCalls === 1 ? { profiles: [] } : profileList();
      }
      if (method === 'profiles.create') return { ok: true, name: input.handle, path: 'must-not-leak', mirrored: {} };
      if (method === 'profiles.describe') return describedProfile;
      if (method === 'profiles.configure') {
        if ((params as { confirm_expensive_model?: boolean } | undefined)?.confirm_expensive_model) {
          confirmed = true;
          return {
            ok: true,
            applied: { ui_meta: true, soul: true, description: true, model: true, skills: true, toolsets: true },
          };
        }
        return {
          ok: false,
          applied: { ui_meta: true, soul: true, description: true, model: false, skills: true, toolsets: true },
          confirm_required: true,
          confirm_message: 'must-not-leak',
        };
      }
      if (method === 'setup.runtime_check') return { ok: confirmed };
      throw new Error(`unexpected Hermes method ${method}`);
    });
    const audit: AuditLogPort = { record: vi.fn(async () => undefined) };
    const useCase = new CreateSharedAgentUseCase(
      runtime(request),
      audit,
      new ListSharedAgentsUseCase(runtime(request)),
    );

    const result = await useCase.execute({ input, actorId: 'admin-id', requestId: 'request-2' });

    expect(result.status).toBe('incomplete');
    expect(result.agent).toMatchObject({ readiness: 'unavailable' });
    expect(result.sections.model).toMatchObject({ status: 'failed' });
    expect(result.requiresConfirmation).toBe(true);
    expect(result.sections.runtime).toMatchObject({ status: 'failed' });
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
    const confirmedResult = await useCase.execute({
      input: { ...input, confirmExpensiveModel: true },
      actorId: 'admin-id',
      requestId: 'request-2-confirmed',
    });
    expect(confirmedResult.status).toBe('ready');
    expect(confirmedResult.requiresConfirmation).toBe(false);
    expect(request).toHaveBeenCalledWith(
      'profiles.configure',
      expect.objectContaining({ confirm_expensive_model: true }),
    );
  });

  it('reuses an existing matching Profile on an idempotent retry without creating a duplicate', async () => {
    const request = vi.fn(async (method: string) => {
      if (method === 'model.options') {
        return { providers: [{ slug: input.provider, name: 'OpenAI Codex', models: [input.model] }] };
      }
      if (method === 'profiles.list') return profileList();
      if (method === 'profiles.describe') return describedProfile;
      if (method === 'profiles.configure') {
        return {
          ok: true,
          applied: { ui_meta: true, soul: true, description: true, model: true, skills: true, toolsets: true },
        };
      }
      if (method === 'setup.runtime_check') return { ok: true };
      throw new Error(`unexpected Hermes method ${method}`);
    });
    const audit: AuditLogPort = { record: vi.fn(async () => undefined) };
    const useCase = new CreateSharedAgentUseCase(
      runtime(request),
      audit,
      new ListSharedAgentsUseCase(runtime(request)),
    );

    await expect(useCase.execute({ input, actorId: 'admin-id', requestId: 'request-3' })).resolves.toMatchObject({
      status: 'ready',
    });
    expect(request).not.toHaveBeenCalledWith('profiles.create', expect.anything());
  });

  it('rejects a stale submission when the handle belongs to a different Profile', async () => {
    const request = vi.fn(async (method: string) => {
      if (method === 'model.options') {
        return { providers: [{ slug: input.provider, name: 'OpenAI Codex', models: [input.model] }] };
      }
      if (method === 'profiles.list') {
        return { profiles: [{ ...profileList().profiles[0], ui_meta: { project_forge_fingerprint: 'different' } }] };
      }
      throw new Error(`unexpected Hermes method ${method}`);
    });
    const audit: AuditLogPort = { record: vi.fn(async () => undefined) };
    const useCase = new CreateSharedAgentUseCase(
      runtime(request),
      audit,
      new ListSharedAgentsUseCase(runtime(request)),
    );

    await expect(useCase.execute({ input, actorId: 'admin-id', requestId: 'request-4' })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(request).not.toHaveBeenCalledWith('profiles.create', expect.anything());
  });

  it('stores an avatar through profiles.set_asset and exposes only safe avatar presence on read-back', async () => {
    const avatar = 'data:image/png;base64,AAECAwQ=';
    const avatarInput = { ...input, handle: 'avatar-agent', displayName: 'Avatar Agent', avatar };
    let listCalls = 0;
    const request = vi.fn(async (method: string) => {
      if (method === 'model.options') {
        return { providers: [{ slug: input.provider, models: [input.model] }] };
      }
      if (method === 'profiles.list') {
        listCalls += 1;
        if (listCalls === 1) return { profiles: [] };
        return {
          profiles: [
            {
              ...profileList().profiles[0],
              name: avatarInput.handle,
              display_name: avatarInput.displayName,
              has_avatar: true,
            },
          ],
        };
      }
      if (method === 'profiles.create')
        return { ok: true, name: avatarInput.handle, path: 'must-not-leak', mirrored: {} };
      if (method === 'profiles.describe') return { ...describedProfile, name: avatarInput.handle };
      if (method === 'profiles.configure') {
        return {
          ok: true,
          applied: { ui_meta: true, soul: true, description: true, model: true, skills: true, toolsets: true },
          ui_meta_revisions: { display_name: 1 },
        };
      }
      if (method === 'profiles.set_asset') return { ok: true, asset: 'avatar', size: 5, data: avatar };
      if (method === 'setup.runtime_check') return { ok: true };
      throw new Error(`unexpected Hermes method ${method}`);
    });
    const audit: AuditLogPort = { record: vi.fn(async () => undefined) };
    const useCase = new CreateSharedAgentUseCase(
      runtime(request),
      audit,
      new ListSharedAgentsUseCase(runtime(request)),
    );

    const result = await useCase.execute({ input: avatarInput, actorId: 'admin-id', requestId: 'request-avatar' });

    expect(result.status).toBe('ready');
    expect(result.agent).toMatchObject({ handle: 'avatar-agent', hasAvatar: true });
    expect(result.sections.avatar).toEqual({ status: 'applied' });
    expect(request).toHaveBeenCalledWith('profiles.set_asset', { name: 'avatar-agent', asset: 'avatar', data: avatar });
    expect(JSON.stringify(result)).not.toContain(avatar);
  });
});
