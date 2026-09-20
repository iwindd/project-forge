import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SESSION_AUTHENTICATOR } from '../../../common/auth/auth.types.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import { PublicErrorFilter } from '../../../common/errors/public-error.filter.js';
import { SECURITY_LOGGER } from '../../../common/security/security-log.port.js';
import { AccessStatus, UserRole } from '../../users/domain/user.js';
import type { HermesSessionAttachment } from '../domain/hermes-session.types.js';
import { HermesSessionService } from '../application/hermes-session.service.js';
import { HermesSessionsController } from './hermes-sessions.controller.js';

const principal: AuthenticatedPrincipal = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  githubUserId: 'github-user',
  githubLogin: 'github-login',
  name: 'User',
  avatarUrl: null,
  role: UserRole.USER,
  accessStatus: AccessStatus.APPROVED,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const session = {
  id: '770e8400-e29b-41d4-a716-446655440000',
  agentHandle: 'lyla',
  title: 'การสนทนาแรก',
  preview: 'สรุปงานล่าสุด',
  messageCount: 2,
  startedAt: '2026-09-20T10:00:00.000Z',
  active: true,
  closedAt: null,
};

const attachment: HermesSessionAttachment = {
  record: {
    id: session.id,
    userId: principal.id,
    agentHandle: 'lyla',
    hermesSessionId: 'stored-secret-id',
    createdAt: new Date('2026-09-20T10:00:00.000Z'),
    updatedAt: new Date('2026-09-20T10:00:00.000Z'),
    closedAt: null,
  },
  runtimeSessionId: 'live-secret-id',
  snapshot: {
    sessionId: session.id,
    agentHandle: 'lyla',
    title: session.title,
    messages: [{ role: 'user', text: 'สวัสดี', timestamp: session.startedAt, rowId: 1 }],
    messageCount: 1,
    status: 'idle',
    inflight: null,
  },
};

describe('Hermes Sessions HTTP contracts', () => {
  let app: INestApplication;
  let baseUrl: string;
  const security = { record: vi.fn(async () => undefined) };
  const authenticator = {
    principalFromToken: vi.fn(async (token: string | undefined) => (token === 'valid-session' ? principal : null)),
  };
  const service = {
    list: vi.fn(async () => [session]),
    create: vi.fn(async () => attachment),
    attach: vi.fn(async () => attachment),
    rename: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  } as unknown as HermesSessionService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HermesSessionsController],
      providers: [
        SessionGuard,
        { provide: SESSION_AUTHENTICATOR, useValue: authenticator },
        { provide: SECURITY_LOGGER, useValue: security },
        { provide: HermesSessionService, useValue: service },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new PublicErrorFilter());
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated Session requests', async () => {
    const response = await fetch(`${baseUrl}/api/v1/hermes/sessions`);
    expect(response.status).toBe(401);
  });

  it('returns User-scoped Session summaries without Hermes identifiers', async () => {
    const response = await fetch(`${baseUrl}/api/v1/hermes/sessions`, {
      headers: { cookie: 'pf_session=valid-session' },
    });
    const body = (await response.json()) as { data: { sessions: unknown[] } };

    expect(response.status).toBe(200);
    expect(body).toEqual({ data: { sessions: [session] } });
    expect(JSON.stringify(body)).not.toContain('stored-secret-id');
  });

  it('creates and resumes a Session through safe response projections', async () => {
    const createResponse = await fetch(`${baseUrl}/api/v1/hermes/sessions`, {
      method: 'POST',
      headers: { cookie: 'pf_session=valid-session', 'content-type': 'application/json' },
      body: JSON.stringify({ agentHandle: 'lyla' }),
    });
    const createBody = (await createResponse.json()) as { data: { session: unknown; snapshot: unknown } };

    expect(createResponse.status).toBe(200);
    expect(createBody.data).toEqual({ session, snapshot: attachment.snapshot });
    expect(JSON.stringify(createBody)).not.toContain('live-secret-id');

    const resumeResponse = await fetch(`${baseUrl}/api/v1/hermes/sessions/${session.id}/resume`, {
      method: 'POST',
      headers: { cookie: 'pf_session=valid-session' },
    });
    expect(resumeResponse.status).toBe(200);
    expect(service.attach).toHaveBeenCalledWith(principal.id, session.id);
  });

  it('validates rename and exposes close as a quiet session action', async () => {
    const renameResponse = await fetch(`${baseUrl}/api/v1/hermes/sessions/${session.id}`, {
      method: 'PATCH',
      headers: { cookie: 'pf_session=valid-session', 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'ชื่อใหม่' }),
    });
    expect(renameResponse.status).toBe(200);
    expect(service.rename).toHaveBeenCalledWith(principal.id, session.id, 'ชื่อใหม่');

    const closeResponse = await fetch(`${baseUrl}/api/v1/hermes/sessions/${session.id}/close`, {
      method: 'POST',
      headers: { cookie: 'pf_session=valid-session' },
    });
    expect(closeResponse.status).toBe(200);
    expect(service.close).toHaveBeenCalledWith(principal.id, session.id);
  });
});
