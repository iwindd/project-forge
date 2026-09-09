import { describe, expect, it, vi } from 'vitest';
import { LogoutUseCase } from './logout-use-case.js';

describe('LogoutUseCase', () => {
  it('revokes a session on logout', async () => {
    const sessions = { revokeByTokenHash: vi.fn(async () => undefined) };
    const useCase = new LogoutUseCase(
      sessions as never,
      { hash: vi.fn(() => 'hashed-token') } as never,
      { run: vi.fn(async <T>(work: () => Promise<T>) => work()) } as never,
    );

    await useCase.execute('token');

    expect(sessions.revokeByTokenHash).toHaveBeenCalledWith('hashed-token');
  });
});
