import { describe, expect, it, vi } from 'vitest';
import { AccessStatus, UserRole, type UserRecord } from '../../domain/user.js';
import { ChangeUserStatusUseCase } from './change-user-status-use-case.js';

const approvedAdmin: UserRecord = {
  id: 'admin-id',
  githubUserId: 'github-id',
  githubLogin: 'admin',
  name: 'Admin',
  avatarUrl: null,
  role: UserRole.ADMIN,
  accessStatus: AccessStatus.APPROVED,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function setup() {
  const users = {
    findById: vi.fn(async () => ({ ...approvedAdmin })),
    countActiveAdminsExcluding: vi.fn(async () => 1),
    save: vi.fn(async () => undefined),
  };
  const sessions = { revokeAllForUser: vi.fn(async () => undefined) };
  const audit = { record: vi.fn(async () => undefined) };
  const unitOfWork = { run: vi.fn(async <T>(work: () => Promise<T>) => work()) };
  return { users, sessions, audit, unitOfWork };
}

describe('ChangeUserStatusUseCase', () => {
  it('rejects self-suspension', async () => {
    const deps = setup();
    const useCase = new ChangeUserStatusUseCase(
      deps.users as never,
      deps.sessions as never,
      deps.audit as never,
      deps.unitOfWork as never,
    );

    await expect(
      useCase.execute('admin-id', 'admin-id', { status: AccessStatus.SUSPENDED, reason: '' }),
    ).rejects.toThrow('You cannot suspend your own account');
    expect(deps.sessions.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('revokes sessions and writes audit when suspending a user', async () => {
    const deps = setup();
    deps.users.findById.mockResolvedValue({ ...approvedAdmin, role: UserRole.USER });
    const useCase = new ChangeUserStatusUseCase(
      deps.users as never,
      deps.sessions as never,
      deps.audit as never,
      deps.unitOfWork as never,
    );

    const result = await useCase.execute('admin-id', 'target-id', {
      status: AccessStatus.SUSPENDED,
      reason: 'security review',
    });

    expect(result.accessStatus).toBe(AccessStatus.SUSPENDED);
    expect(result.isActive).toBe(false);
    expect(deps.sessions.revokeAllForUser).toHaveBeenCalledWith('admin-id');
    expect(deps.audit.record).toHaveBeenCalledOnce();
  });
});
