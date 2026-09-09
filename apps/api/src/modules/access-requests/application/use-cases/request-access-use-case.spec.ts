import { describe, expect, it, vi } from 'vitest';
import { AccessRequestStatus, type AccessRequestRecord } from '../../domain/access-request.js';
import { RequestAccessUseCase } from './request-access-use-case.js';

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

describe('RequestAccessUseCase', () => {
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
});
