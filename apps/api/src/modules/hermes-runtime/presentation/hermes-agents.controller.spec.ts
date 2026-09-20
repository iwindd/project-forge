import { describe, expect, it, vi } from 'vitest';
import { AccessStatus, UserRole } from '../../users/domain/user.js';
import { HermesAgentsController } from './hermes-agents.controller.js';
import type { ListSharedAgentsUseCase } from '../application/use-cases/list-shared-agents-use-case.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import type { GetSharedAgentOptionsUseCase } from '../application/use-cases/get-shared-agent-options-use-case.js';
import type { CreateSharedAgentUseCase } from '../application/use-cases/create-shared-agent-use-case.js';

const roster = {
  agents: [],
  runtime: { state: 'ready' as const, message: 'Hermes is ready', action: null },
  permissions: { canConfigure: false },
  refreshedAt: '2026-09-20T00:00:00.000Z',
};

function principal(role: UserRole): AuthenticatedPrincipal {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    githubUserId: '123',
    githubLogin: 'ada',
    name: 'Ada',
    avatarUrl: null,
    role,
    accessStatus: AccessStatus.APPROVED,
    isActive: true,
    createdAt: new Date('2026-09-10T00:00:00.000Z'),
    updatedAt: new Date('2026-09-10T00:00:00.000Z'),
  };
}

describe('HermesAgentsController', () => {
  it('allows an authenticated User to read the shared roster without Organization filtering', async () => {
    const listSharedAgents = { execute: vi.fn().mockResolvedValue(roster) } as unknown as ListSharedAgentsUseCase;
    const controller = new HermesAgentsController(
      listSharedAgents,
      {} as GetSharedAgentOptionsUseCase,
      {} as CreateSharedAgentUseCase,
    );

    await expect(controller.list(principal(UserRole.USER))).resolves.toEqual({ data: roster });
    expect(listSharedAgents.execute).toHaveBeenCalledWith({ canConfigure: false });
  });

  it('reports Platform Admin configuration capability separately from Organization roles', async () => {
    const listSharedAgents = {
      execute: vi.fn().mockResolvedValue({ ...roster, permissions: { canConfigure: true } }),
    } as unknown as ListSharedAgentsUseCase;
    const controller = new HermesAgentsController(
      listSharedAgents,
      {} as GetSharedAgentOptionsUseCase,
      {} as CreateSharedAgentUseCase,
    );

    await expect(controller.list(principal(UserRole.ADMIN))).resolves.toEqual({
      data: { ...roster, permissions: { canConfigure: true } },
    });
    expect(listSharedAgents.execute).toHaveBeenCalledWith({ canConfigure: true });
  });

  it('returns runtime-backed configuration options and creates through the application use case', async () => {
    const listSharedAgents = { execute: vi.fn().mockResolvedValue(roster) } as unknown as ListSharedAgentsUseCase;
    const options = {
      execute: vi.fn().mockResolvedValue({
        models: [{ provider: 'openai-codex', name: 'OpenAI Codex', models: ['gpt-5.6-luna'] }],
        skills: ['skill-a'],
        toolsets: [{ name: 'coding', label: 'Coding', description: 'Coding tools', toolCount: 1 }],
        runtime: { state: 'ready', message: 'Hermes is ready', action: null },
        refreshedAt: '2026-09-20T00:00:00.000Z',
      }),
    } as unknown as GetSharedAgentOptionsUseCase;
    const created = {
      execute: vi.fn().mockResolvedValue({
        handle: 'builder',
        status: 'ready',
        agent: {
          handle: 'builder',
          displayName: 'Builder',
          description: 'Shared implementation Agent',
          isDefault: false,
          model: 'gpt-5.6-luna',
          provider: 'openai-codex',
          skillCount: 1,
          hasAvatar: false,
          readiness: 'ready',
          message: 'Ready to use',
          action: 'use',
        },
        sections: {
          identity: { status: 'applied' },
          role: { status: 'applied' },
          personality: { status: 'applied' },
          model: { status: 'applied' },
          skills: { status: 'applied' },
          toolsets: { status: 'applied' },
          avatar: { status: 'skipped' },
          readback: { status: 'applied' },
          runtime: { status: 'applied' },
          audit: { status: 'applied' },
        },
        requiresConfirmation: false,
        refreshedAt: '2026-09-20T00:00:00.000Z',
      }),
    } as unknown as CreateSharedAgentUseCase;
    const controller = new HermesAgentsController(listSharedAgents, options, created);
    const body = {
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
    const request = { header: vi.fn().mockReturnValue('request-30') } as never;

    await expect(controller.options()).resolves.toMatchObject({ data: { models: expect.any(Array) } });
    await expect(controller.create(body, principal(UserRole.ADMIN), request)).resolves.toMatchObject({
      data: { handle: 'builder', status: 'ready' },
    });
    expect(options.execute).toHaveBeenCalledOnce();
    expect(created.execute).toHaveBeenCalledWith({
      input: body,
      actorId: principal(UserRole.ADMIN).id,
      requestId: 'request-30',
    });
  });
});
