import { describe, expect, it, vi } from 'vitest';
import { AccessStatus, UserRole } from '../../domain/user.js';
import { ChangeUserNameUseCase } from './change-user-name-use-case.js';

describe('ChangeUserNameUseCase', () => {
  it('does not write when the normalized name is unchanged', async () => {
    const user = {
      id: 'user-id',
      name: 'User',
      githubUserId: 'github-id',
      githubLogin: 'user',
      avatarUrl: null,
      role: UserRole.USER,
      accessStatus: AccessStatus.APPROVED,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const users = { findById: vi.fn(async () => user), save: vi.fn() };
    const useCase = new ChangeUserNameUseCase(
      users as never,
      { record: vi.fn() } as never,
      { run: vi.fn(async <T>(work: () => Promise<T>) => work()) } as never,
    );

    await expect(useCase.execute('user-id', 'user-id', { name: ' User ' })).resolves.toBe(user);
    expect(users.save).not.toHaveBeenCalled();
  });
});
