import { describe, expect, it, vi } from 'vitest';
import { GetUserUseCase } from './get-user-use-case.js';

describe('GetUserUseCase', () => {
  it('throws when the user does not exist', async () => {
    const users = { findById: vi.fn(async () => null) };
    const useCase = new GetUserUseCase(users as never);

    await expect(useCase.execute('missing-user')).rejects.toThrow('User was not found');
  });
});
