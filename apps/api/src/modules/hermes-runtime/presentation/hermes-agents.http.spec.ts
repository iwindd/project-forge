import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SESSION_AUTHENTICATOR } from '../../../common/auth/auth.types.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { AdminGuard } from '../../../common/auth/admin.guard.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import { PublicErrorFilter } from '../../../common/errors/public-error.filter.js';
import { SECURITY_LOGGER } from '../../../common/security/security-log.port.js';
import { AUDIT_LOGGER } from '../../../common/audit/audit.port.js';
import { AccessStatus, UserRole } from '../../users/domain/user.js';
import { HermesRuntimeService } from '../application/hermes-runtime.service.js';
import { ListSharedAgentsUseCase } from '../application/use-cases/list-shared-agents-use-case.js';
import { GetSharedAgentOptionsUseCase } from '../application/use-cases/get-shared-agent-options-use-case.js';
import { CreateSharedAgentUseCase } from '../application/use-cases/create-shared-agent-use-case.js';
import { HermesAgentsController } from './hermes-agents.controller.js';

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

const adminPrincipal: AuthenticatedPrincipal = {
  ...principal,
  id: '660e8400-e29b-41d4-a716-446655440000',
  role: UserRole.ADMIN,
};

const roster = {
  agents: [
    {
      handle: 'lyla',
      displayName: 'Lyla',
      description: 'Shared local coding Agent',
      isDefault: true,
      model: 'gpt-5.6-luna',
      provider: 'openai-codex',
      skillCount: 12,
      hasAvatar: false,
      readiness: 'ready' as const,
      message: 'Ready to use',
      action: 'use' as const,
    },
  ],
  runtime: { state: 'ready' as const, message: 'Hermes is ready', action: null },
  permissions: { canConfigure: false },
  refreshedAt: '2026-09-20T00:00:00.000Z',
};

describe('Hermes Agents HTTP contracts', () => {
  let app: INestApplication;
  let baseUrl: string;
  const security = { record: vi.fn(async () => undefined) };
  const authenticator = {
    principalFromToken: vi.fn(async (token: string | undefined) =>
      token === 'valid-session' ? principal : token === 'admin-session' ? adminPrincipal : null,
    ),
  };
  let builderCreated = false;
  const runtime = {
    getStatus: vi.fn(() => ({
      state: 'ready' as const,
      endpoint: { host: '127.0.0.1', port: 9119, path: '/api/ws', managed: true },
      version: '0.21.3',
      capabilities: ['profiles.list'],
      backendEpoch: 'test-epoch',
      serverRequests: 'advertised' as const,
      checkedAt: '2026-09-20T00:00:00.000Z',
      message: 'Hermes is ready',
      action: null,
    })),
    request: vi.fn(async (method: string, params?: unknown) => {
      if (method === 'model.options') {
        return { providers: [{ slug: 'openai-codex', name: 'OpenAI Codex', models: ['gpt-5.6-luna'] }] };
      }
      if (method === 'profiles.list') {
        return {
          profiles: [
            {
              name: 'lyla',
              display_name: 'Lyla',
              description: 'Shared local coding Agent',
              is_default: true,
              model: 'gpt-5.6-luna',
              provider: 'openai-codex',
              skill_count: 12,
            },
            ...(builderCreated
              ? [
                  {
                    name: 'builder',
                    display_name: 'Builder',
                    description: 'Shared implementation Agent',
                    is_default: false,
                    model: 'gpt-5.6-luna',
                    provider: 'openai-codex',
                    skill_count: 1,
                    has_avatar: false,
                    ui_meta: { display_name: 'Builder', role: 'Implementer' },
                  },
                ]
              : []),
          ],
        };
      }
      if (method === 'profiles.create') {
        builderCreated = true;
        return { ok: true, name: 'builder', path: 'must-not-leak', mirrored: {} };
      }
      if (method === 'profiles.describe' && (params as { name?: string } | undefined)?.name === 'builder') {
        return {
          name: 'builder',
          description: 'Shared implementation Agent',
          soul: 'You are a careful implementation assistant.',
          model: { provider: 'openai-codex', default: 'gpt-5.6-luna' },
          skills: [{ name: 'skill-a', enabled: true }],
          toolsets: [{ name: 'coding', enabled: true, label: 'Coding', description: 'Coding tools', tool_count: 1 }],
        };
      }
      if (method === 'profiles.describe') {
        return {
          name: 'lyla',
          skills: [{ name: 'skill-a', enabled: true }],
          toolsets: [{ name: 'coding', enabled: true, label: 'Coding', description: 'Coding tools', tool_count: 1 }],
        };
      }
      if (method === 'profiles.configure') {
        return {
          ok: true,
          applied: { ui_meta: true, soul: true, description: true, model: true, skills: true, toolsets: true },
        };
      }
      return { ok: true };
    }),
  } as unknown as HermesRuntimeService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HermesAgentsController],
      providers: [
        SessionGuard,
        AdminGuard,
        { provide: SESSION_AUTHENTICATOR, useValue: authenticator },
        { provide: SECURITY_LOGGER, useValue: security },
        { provide: AUDIT_LOGGER, useValue: { record: vi.fn(async () => undefined) } },
        { provide: HermesRuntimeService, useValue: runtime },
        ListSharedAgentsUseCase,
        GetSharedAgentOptionsUseCase,
        CreateSharedAgentUseCase,
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

  it('rejects unauthenticated requests with the standard envelope', async () => {
    const response = await fetch(`${baseUrl}/api/v1/hermes/agents`, {
      headers: { 'x-request-id': 'hermes-agents-401' },
    });
    const body = (await response.json()) as { data?: unknown; error?: { code: string; requestId: string } };

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Please sign in with GitHub',
        details: {},
        requestId: 'hermes-agents-401',
      },
    });
  });

  it('returns the safe shared roster for an authenticated request', async () => {
    const response = await fetch(`${baseUrl}/api/v1/hermes/agents`, {
      headers: { cookie: 'pf_session=valid-session', 'x-request-id': 'hermes-agents-200' },
    });
    const body = (await response.json()) as { data?: unknown; error?: { code: string; requestId: string } };
    const responseBody = body as { data: typeof roster };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ data: { ...roster, refreshedAt: expect.any(String) } });
    expect(responseBody.data.refreshedAt).toMatch(/^2026-09-20T/);
    expect(runtime.request).toHaveBeenCalledWith('profiles.list', { include_sessions: false });
  });

  it('returns capability options only to a Platform Admin and strips server-only metadata', async () => {
    const response = await fetch(`${baseUrl}/api/v1/hermes/agents/options`, {
      headers: { cookie: 'pf_session=admin-session', 'x-request-id': 'hermes-agents-options' },
    });
    const body = (await response.json()) as { data?: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      models: [{ provider: 'openai-codex', name: 'OpenAI Codex', models: ['gpt-5.6-luna'] }],
      skills: ['skill-a'],
      toolsets: [{ name: 'coding', toolCount: 1 }],
      runtime: { state: 'ready', message: 'Hermes is ready', action: null },
    });
    expect(JSON.stringify(body)).not.toContain('127.0.0.1:9119');
    expect(JSON.stringify(body)).not.toContain('must-not-leak');
  });

  it('rejects Agent creation for an authenticated non-admin', async () => {
    const response = await fetch(`${baseUrl}/api/v1/hermes/agents`, {
      method: 'POST',
      headers: {
        cookie: 'pf_session=valid-session',
        'content-type': 'application/json',
        'x-request-id': 'hermes-agents-403',
      },
      body: JSON.stringify({}),
    });
    const body = (await response.json()) as { data?: unknown; error?: { code: string; requestId: string } };

    expect(response.status).toBe(403);
    expect(body.error).toMatchObject({ code: 'ADMIN_REQUIRED', requestId: 'hermes-agents-403' });
  });

  it('creates a shared Agent for a Platform Admin and returns read-back readiness', async () => {
    const response = await fetch(`${baseUrl}/api/v1/hermes/agents`, {
      method: 'POST',
      headers: {
        cookie: 'pf_session=admin-session',
        'content-type': 'application/json',
        'x-request-id': 'hermes-agents-create',
      },
      body: JSON.stringify({
        handle: 'builder',
        displayName: 'Builder',
        description: 'Shared implementation Agent',
        role: 'Implementer',
        personality: 'You are a careful implementation assistant.',
        provider: 'openai-codex',
        model: 'gpt-5.6-luna',
        skills: ['skill-a'],
        toolsets: ['coding'],
        avatar: null,
      }),
    });
    const body = (await response.json()) as { data?: unknown; error?: { code: string; requestId: string } };

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      handle: 'builder',
      status: 'ready',
      agent: { handle: 'builder', readiness: 'ready' },
    });
    expect(JSON.stringify(body)).not.toContain('must-not-leak');
    expect(runtime.request).toHaveBeenCalledWith('profiles.create', expect.objectContaining({ name: 'builder' }));
    expect(runtime.request).toHaveBeenCalledWith('profiles.configure', expect.objectContaining({ name: 'builder' }));
  });

  it('reconciles an identical retry without creating a duplicate Hermes Profile', async () => {
    builderCreated = true;
    const response = await fetch(`${baseUrl}/api/v1/hermes/agents`, {
      method: 'POST',
      headers: {
        cookie: 'pf_session=admin-session',
        'content-type': 'application/json',
        'x-request-id': 'hermes-agents-idempotent-retry',
      },
      body: JSON.stringify({
        handle: 'builder',
        displayName: 'Builder',
        description: 'Shared implementation Agent',
        role: 'Implementer',
        personality: 'You are a careful implementation assistant.',
        provider: 'openai-codex',
        model: 'gpt-5.6-luna',
        skills: ['skill-a'],
        toolsets: ['coding'],
        avatar: null,
      }),
    });
    const body = (await response.json()) as { data?: unknown };

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ handle: 'builder', status: 'ready' });
    expect(runtime.request).not.toHaveBeenCalledWith('profiles.create', expect.anything());
  });
});
