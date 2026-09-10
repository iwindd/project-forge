import { describe, expect, it, vi } from 'vitest';
import { IssueSessionUseCase } from './issue-session-use-case.js';

describe('IssueSessionUseCase', () => {
  it('creates a session token without organization state', async () => {
    const sessions = { create: vi.fn(async () => undefined) };
    const tokens = { base64Url: vi.fn(() => 'session-token') };
    const hasher = { hash: vi.fn(() => 'hashed-token') };
    const config = { sessionTtlSeconds: 3600 };
    const unitOfWork = { run: vi.fn(async <T>(work: () => Promise<T>) => work()) };
    const useCase = new IssueSessionUseCase(
      sessions as never,
      tokens as never,
      hasher as never,
      config as never,
      unitOfWork as never,
    );

    await expect(useCase.execute('user-id')).resolves.toBe('session-token');
    expect(tokens.base64Url).toHaveBeenCalledWith(32);
    expect(sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-id', tokenHash: 'hashed-token' }),
    );
  });
});
