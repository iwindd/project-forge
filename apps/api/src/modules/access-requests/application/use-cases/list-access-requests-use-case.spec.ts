import { describe, expect, it, vi } from 'vitest';
import { AccessRequestStatus, type AccessRequestRecord } from '../../domain/access-request.js';
import { AccessStatus, UserRole, type UserRecord } from '../../../users/domain/user.js';
import { ListAccessRequestsUseCase } from './list-access-requests-use-case.js';

const request: AccessRequestRecord = {
  id: 'request-id',
  userId: 'user-id',
  reason: null,
  status: AccessRequestStatus.PENDING,
  reviewedBy: null,
  reviewedAt: null,
  reviewNote: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const user: UserRecord = {
  id: 'user-id',
  githubUserId: 'github-id',
  githubLogin: 'user',
  name: null,
  avatarUrl: null,
  role: UserRole.USER,
  accessStatus: AccessStatus.PENDING,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('ListAccessRequestsUseCase', () => {
  it('joins access requests with their users', async () => {
    const requests = { findAll: vi.fn(async () => [request]) };
    const users = { findById: vi.fn(async () => user) };
    const useCase = new ListAccessRequestsUseCase(requests as never, users as never);

    await expect(useCase.execute()).resolves.toEqual([{ request, user }]);
    expect(users.findById).toHaveBeenCalledWith('user-id');
  });
});
