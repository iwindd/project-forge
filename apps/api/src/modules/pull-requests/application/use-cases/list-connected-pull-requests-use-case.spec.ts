import { describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../../../common/errors/application-error.js';
import { ListConnectedPullRequestsUseCase } from './list-connected-pull-requests-use-case.js';

describe('ListConnectedPullRequestsUseCase', () => {
  it('resolves only the authenticated user GitHub connection and never returns its token', async () => {
    const github = { list: vi.fn().mockResolvedValue({ items: [], page: 1, perPage: 20, hasNextPage: false }) };
    const em = {
      findOne: vi.fn().mockResolvedValue({
        userId: 'user-1',
        provider: 'GITHUB',
        providerUsername: 'forge',
        accessTokenCiphertext: 'cipher',
      }),
    };
    const useCase = new ListConnectedPullRequestsUseCase(
      em as never,
      github as never,
      { decrypt: vi.fn().mockReturnValue('secret'), encrypt: vi.fn() } as never,
    );
    await expect(useCase.execute('user-1', 1, 20)).resolves.toEqual({
      items: [],
      page: 1,
      perPage: 20,
      hasNextPage: false,
    });
    expect(em.findOne).toHaveBeenCalledWith(expect.anything(), { userId: 'user-1', provider: 'GITHUB' });
    expect(github.list).toHaveBeenCalledWith('secret', 'forge', 1, 20);
  });

  it('maps a missing connection to not found', async () => {
    const useCase = new ListConnectedPullRequestsUseCase(
      { findOne: vi.fn().mockResolvedValue(null) } as never,
      {} as never,
      {} as never,
    );
    await expect(useCase.execute('user-1', 1, 20)).rejects.toBeInstanceOf(NotFoundError);
  });
});
