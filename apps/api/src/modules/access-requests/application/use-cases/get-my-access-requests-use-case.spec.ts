import { describe, expect, it, vi } from 'vitest';
import type { AccessRequestRecord } from '../../domain/access-request.js';
import { GetMyAccessRequestsUseCase } from './get-my-access-requests-use-case.js';

const request = { id: 'request-id' } as AccessRequestRecord;

describe('GetMyAccessRequestsUseCase', () => {
  it('returns the requests for the current user', async () => {
    const requests = { findByUserId: vi.fn(async () => [request]) };
    const useCase = new GetMyAccessRequestsUseCase(requests as never);

    await expect(useCase.execute('user-id')).resolves.toEqual([request]);
    expect(requests.findByUserId).toHaveBeenCalledWith('user-id');
  });
});
