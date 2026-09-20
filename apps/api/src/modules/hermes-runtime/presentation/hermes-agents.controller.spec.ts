import { describe, expect, it, vi } from 'vitest';
import { AccessStatus, UserRole } from '../../users/domain/user.js';
import { HermesAgentsController } from './hermes-agents.controller.js';
import type { ListSharedAgentsUseCase } from '../application/use-cases/list-shared-agents-use-case.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';

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
    const controller = new HermesAgentsController(listSharedAgents);

    await expect(controller.list(principal(UserRole.USER))).resolves.toEqual({ data: roster });
    expect(listSharedAgents.execute).toHaveBeenCalledWith({ canConfigure: false });
  });

  it('reports Platform Admin configuration capability separately from Organization roles', async () => {
    const listSharedAgents = {
      execute: vi.fn().mockResolvedValue({ ...roster, permissions: { canConfigure: true } }),
    } as unknown as ListSharedAgentsUseCase;
    const controller = new HermesAgentsController(listSharedAgents);

    await expect(controller.list(principal(UserRole.ADMIN))).resolves.toEqual({
      data: { ...roster, permissions: { canConfigure: true } },
    });
    expect(listSharedAgents.execute).toHaveBeenCalledWith({ canConfigure: true });
  });
});
