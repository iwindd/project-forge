import { describe, expect, it, vi } from 'vitest';
import { AccessStatus, UserRole } from '../../domain/user.js';
import { ChangeUserRoleUseCase } from './change-user-role-use-case.js';

describe('ChangeUserRoleUseCase', () => {
  it('prevents an administrator from removing their own access', async () => {
    const users = {
      findById: vi.fn(async () => ({
        id: 'admin-id',
        name: 'Admin',
        githubUserId: 'github-id',
        githubLogin: 'admin',
        avatarUrl: null,
        role: UserRole.ADMIN,
        accessStatus: AccessStatus.APPROVED,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      save: vi.fn(),
    };
    const useCase = new ChangeUserRoleUseCase(
      users as never,
      { record: vi.fn() } as never,
      { run: vi.fn(async <T>(work: () => Promise<T>) => work()) } as never,
    );

    await expect(useCase.execute('admin-id', 'admin-id', { role: UserRole.USER })).rejects.toThrow(
      'You cannot remove your own administrator access',
    );
    expect(users.save).not.toHaveBeenCalled();
  });
});
