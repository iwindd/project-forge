import { describe, expect, it, vi } from 'vitest';
import { RevokeUserSessionsUseCase } from './revoke-user-sessions-use-case.js';

describe('RevokeUserSessionsUseCase', () => {
  it('revokes all sessions and records the action', async () => {
    const users = { findById: vi.fn(async () => ({ id: 'target-id' })) };
    const sessions = { revokeAllForUser: vi.fn(async () => undefined) };
    const audit = { record: vi.fn(async () => undefined) };
    const unitOfWork = { run: vi.fn(async <T>(work: () => Promise<T>) => work()) };
    const useCase = new RevokeUserSessionsUseCase(
      users as never,
      sessions as never,
      audit as never,
      unitOfWork as never,
    );

    await expect(useCase.execute('admin-id', 'target-id')).resolves.toEqual({ ok: true });
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith('target-id');
    expect(audit.record).toHaveBeenCalledOnce();
  });
});
