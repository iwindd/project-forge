import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { AccessRequestsController } from './access-requests.controller.js';

const userId = '550e8400-e29b-41d4-a716-446655440000';
const requestId = '550e8400-e29b-41d4-a716-446655440001';
const now = new Date('2026-01-01T00:00:00.000Z');

const principal = { id: userId } as AuthenticatedPrincipal;
const request = {
  id: requestId,
  userId,
  reason: 'Need access',
  status: 'PENDING',
  reviewedBy: null,
  reviewedAt: null,
  reviewNote: null,
  createdAt: now,
  updatedAt: now,
};
const user = {
  id: userId,
  githubUserId: 'github-user',
  githubLogin: 'github-login',
  name: 'User',
  avatarUrl: null,
  role: 'USER',
  accessStatus: 'PENDING',
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

function createController() {
  return new AccessRequestsController(
    { execute: vi.fn() } as never,
    { execute: vi.fn() } as never,
    { execute: vi.fn() } as never,
    { execute: vi.fn() } as never,
  );
}

describe('AccessRequestsController', () => {
  it('wraps current-user requests in the standard envelope', async () => {
    const controller = createController();
    const getMine = vi.mocked(
      (controller as unknown as { getMine: { execute: ReturnType<typeof vi.fn> } })
        .getMine.execute,
    );
    getMine.mockResolvedValue([request]);

    await expect(controller.getMyRequests(principal)).resolves.toEqual({
      data: {
        requests: [
          expect.objectContaining({
            id: requestId,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          }),
        ],
      },
    });
  });

  it('wraps mutation and admin review results in runtime-validated envelopes', async () => {
    const controller = createController();
    const requestAccess = vi.mocked(
      (controller as unknown as { requestAccess: { execute: ReturnType<typeof vi.fn> } })
        .requestAccess.execute,
    );
    const review = vi.mocked(
      (controller as unknown as { reviewAccessRequest: { execute: ReturnType<typeof vi.fn> } })
        .reviewAccessRequest.execute,
    );
    requestAccess.mockResolvedValue(request);
    review.mockResolvedValue({ request, user });

    await expect(controller.request(principal, {})).resolves.toEqual({
      data: { request: expect.objectContaining({ id: requestId }) },
    });
    await expect(
      controller.approve({ id: requestId }, principal, {}),
    ).resolves.toEqual({
      data: {
        request: expect.objectContaining({ id: requestId }),
        user: expect.objectContaining({ id: userId }),
      },
    });
  });

  it('rejects invalid route parameters and invalid use-case output', async () => {
    const controller = createController();
    const review = vi.mocked(
      (controller as unknown as { reviewAccessRequest: { execute: ReturnType<typeof vi.fn> } })
        .reviewAccessRequest.execute,
    );
    review.mockResolvedValue({ request, user });

    await expect(controller.reject({ id: 'not-a-uuid' }, principal, {})).rejects.toThrow();

    const getMine = vi.mocked(
      (controller as unknown as { getMine: { execute: ReturnType<typeof vi.fn> } })
        .getMine.execute,
    );
    getMine.mockResolvedValue([{ ...request, id: 'not-a-uuid' }]);
    await expect(controller.getMyRequests(principal)).rejects.toThrow();
  });
});
