import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SESSION_AUTHENTICATOR } from '../../../common/auth/auth.types.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import { PublicErrorFilter } from '../../../common/errors/public-error.filter.js';
import { SECURITY_LOGGER } from '../../../common/security/security-log.port.js';
import { AccessStatus, UserRole } from '../../users/domain/user.js';
import { ListSharedAgentsUseCase } from '../application/use-cases/list-shared-agents-use-case.js';
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
    principalFromToken: vi.fn(async (token: string | undefined) => (token === 'valid-session' ? principal : null)),
  };
  const listSharedAgents = {
    execute: vi.fn(async () => roster),
  } as unknown as ListSharedAgentsUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HermesAgentsController],
      providers: [
        SessionGuard,
        { provide: SESSION_AUTHENTICATOR, useValue: authenticator },
        { provide: SECURITY_LOGGER, useValue: security },
        { provide: ListSharedAgentsUseCase, useValue: listSharedAgents },
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
    const body = await response.json();

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
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ data: roster });
    expect(listSharedAgents.execute).toHaveBeenCalledWith({ canConfigure: false });
  });
});
