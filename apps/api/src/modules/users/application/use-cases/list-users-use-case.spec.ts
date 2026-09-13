import { describe, expect, it, vi } from 'vitest';
import { ListUsersUseCase } from './list-users-use-case.js';

describe('ListUsersUseCase', () => {
  it('normalizes pagination before querying the repository', async () => {
    const users = { list: vi.fn(async () => ({ data: [], total: 0 })) };
    const useCase = new ListUsersUseCase(users as never);

    await expect(useCase.execute({ page: 0, limit: 1000 })).resolves.toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 100,
    });
    expect(users.list).toHaveBeenCalledWith({
      page: 1,
      limit: 100,
      search: undefined,
      status: undefined,
      role: undefined,
    });
  });
});
