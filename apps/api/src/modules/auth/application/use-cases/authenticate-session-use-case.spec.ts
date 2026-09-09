import { describe, expect, it, vi } from 'vitest';
import { AccessStatus, UserRole, type UserRecord } from '../../../users/domain/user.js';
import type { SessionRecord } from '../../domain/session.js';
import { AuthenticateSessionUseCase } from './authenticate-session-use-case.js';

const user: UserRecord = {
  id: 'user-id',
  githubUserId: 'github-id',
  githubLogin: 'user',
  name: 'User',
  avatarUrl: null,
  role: UserRole.USER,
  accessStatus: AccessStatus.APPROVED,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const session: SessionRecord = {
  id: 'session-id',
  userId: 'user-id',
  activeOrganizationId: null,
  tokenHash: 'hashed-token',
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  lastSeenAt: new Date('2026-01-01T00:00:00.000Z'),
};

function unitOfWork() {
  return { run: vi.fn(async <T>(work: () => Promise<T>) => work()) };
}

describe('AuthenticateSessionUseCase', () => {
  it('rejects expired sessions', async () => {
    const sessions = {
      findActiveByTokenHash: vi.fn(async () => ({ ...session, expiresAt: new Date(Date.now() - 1) })),
      save: vi.fn(),
    };
    const users = { findById: vi.fn(async () => user) };
    const useCase = new AuthenticateSessionUseCase(
      sessions as never,
      { hash: vi.fn(() => 'hashed-token') } as never,
      users as never,
      unitOfWork() as never,
    );

    await expect(useCase.principalFromToken('token')).resolves.toBeNull();
    expect(users.findById).not.toHaveBeenCalled();
  });

  it('refreshes last-seen time for a valid session', async () => {
    const sessions = {
      findActiveByTokenHash: vi.fn(async () => ({ ...session })),
      save: vi.fn(async () => undefined),
    };
    const useCase = new AuthenticateSessionUseCase(
      sessions as never,
      { hash: vi.fn(() => 'hashed-token') } as never,
      { findById: vi.fn(async () => user) } as never,
      unitOfWork() as never,
    );

    await expect(useCase.principalFromToken('token')).resolves.toMatchObject({ id: 'user-id' });
    expect(sessions.save).toHaveBeenCalledOnce();
  });
});
