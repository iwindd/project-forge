import { describe, expect, it, vi } from 'vitest';
import { ExternalServiceError, NotFoundError } from '../../../../common/errors/application-error.js';
import type { SecretCipherPort } from '../../../auth/application/ports/auth.ports.js';
import type { ProfileConnectionRepository } from '../../../auth/infrastructure/persistence/profile-connection.repository.js';
import { ListGithubIssuesUseCase } from './list-github-issues-use-case.js';
import type { GithubIssuesPort } from '../ports/github-issues.port.js';

describe('ListGithubIssuesUseCase', () => {
  const connection = {
    provider: 'github',
    accessTokenCiphertext: 'encrypted-token',
    providerUsername: 'ada',
  };
  const connections = {
    findConnections: vi.fn().mockResolvedValue([connection]),
  } as unknown as ProfileConnectionRepository;
  const cipher = {
    decrypt: vi.fn().mockReturnValue('github-token'),
  } as unknown as SecretCipherPort;
  const github = {
    listIssues: vi.fn().mockResolvedValue({ issues: [], hasNext: false }),
  } as unknown as GithubIssuesPort;

  it('resolves the active user connection and never returns provider credentials', async () => {
    const useCase = new ListGithubIssuesUseCase(connections, cipher, github);

    const result = await useCase.execute({ userId: 'user-1', page: 2, pageSize: 10 });

    expect(github.listIssues).toHaveBeenCalledWith('github-token', { page: 2, pageSize: 10 });
    expect(result).toEqual({ issues: [], page: 2, pageSize: 10, hasNext: false });
    expect(JSON.stringify(result)).not.toContain('token');
  });

  it('rejects users without a usable GitHub connection', async () => {
    connections.findConnections = vi.fn().mockResolvedValue([{ provider: 'gitlab', accessTokenCiphertext: 'x' }]);
    const useCase = new ListGithubIssuesUseCase(connections, cipher, github);

    await expect(useCase.execute({ userId: 'user-2', page: 1, pageSize: 25 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('preserves provider failures as external service errors', async () => {
    connections.findConnections = vi.fn().mockResolvedValue([connection]);
    github.listIssues = vi.fn().mockRejectedValue(new ExternalServiceError('GitHub issues lookup failed'));
    const useCase = new ListGithubIssuesUseCase(connections, cipher, github);

    await expect(useCase.execute({ userId: 'user-1', page: 1, pageSize: 25 })).rejects.toBeInstanceOf(
      ExternalServiceError,
    );
  });
});
