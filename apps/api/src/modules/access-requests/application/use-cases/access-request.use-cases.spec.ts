import { describe, expect, it, vi } from 'vitest';
import { RequestAccessUseCase, ReviewAccessRequestUseCase } from './access-request.use-cases.js';
import { AccessRequestStatus, type AccessRequestRecord } from '../../domain/access-request.js';
import { AccessStatus, UserRole, type UserRecord } from '../../../users/domain/user.js';

const pending: AccessRequestRecord = {
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

describe('access request use cases', () => {
  it('returns the existing pending request instead of creating a duplicate', async () => {
    const requests = {
      findPendingByUserId: vi.fn(async () => pending),
      save: vi.fn(async () => undefined),
    };
    const unitOfWork = { run: vi.fn(async <T>(work: () => Promise<T>) => work()) };
    const useCase = new RequestAccessUseCase(requests as never, unitOfWork as never);

    const result = await useCase.execute('user-id', { reason: 'still need access' });

    expect(result).toBe(pending);
    expect(requests.save).not.toHaveBeenCalled();
  });

  it('approves a request, activates the user and records the decision', async () => {
    const requests = {
      findById: vi.fn(async () => ({ ...pending })),
      save: vi.fn(async () => undefined),
    };
    const users = {
      findById: vi.fn(async () => ({ ...user })),
      save: vi.fn(async () => undefined),
    };
    const audit = { record: vi.fn(async () => undefined) };
    const unitOfWork = { run: vi.fn(async <T>(work: () => Promise<T>) => work()) };
    const useCase = new ReviewAccessRequestUseCase(
      requests as never,
      users as never,
      audit as never,
      unitOfWork as never,
    );

    const result = await useCase.execute('admin-id', 'request-id', 'approve', 'approved');

    expect(result.request.status).toBe(AccessRequestStatus.APPROVED);
    expect(result.user.accessStatus).toBe(AccessStatus.APPROVED);
    expect(result.user.isActive).toBe(true);
    expect(audit.record).toHaveBeenCalledOnce();
  });
});
