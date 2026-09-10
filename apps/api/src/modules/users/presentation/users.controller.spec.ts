import { describe, expect, it, vi } from 'vitest';
import { AccessStatus } from '../domain/user.js';
import { UsersController } from './users.controller.js';

describe('UsersController HTTP boundaries', () => {
  it('rejects invalid user route parameters before calling the use-case', async () => {
    const controller = new UsersController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(controller.get({ id: 'not-a-uuid' })).rejects.toThrow();
  });

  it('normalizes public list filters before calling the use-case', async () => {
    const listUsers = {
      execute: vi.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 2,
        limit: 50,
      }),
    };
    const controller = new UsersController(
      listUsers as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await controller.list({ status: 'active', page: '2', pageSize: '50' });

    expect(listUsers.execute).toHaveBeenCalledWith({
      search: undefined,
      status: AccessStatus.APPROVED,
      role: undefined,
      page: 2,
      limit: 50,
    });
  });
});
