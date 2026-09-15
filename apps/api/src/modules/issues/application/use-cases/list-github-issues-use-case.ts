import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors/application-error.js';
import { SECRET_CIPHER } from '../../../auth/application/ports/auth.ports.js';
import type { SecretCipherPort } from '../../../auth/application/ports/auth.ports.js';
import { ProfileConnectionRepository } from '../../../auth/infrastructure/persistence/profile-connection.repository.js';
import { GITHUB_ISSUES } from '../ports/github-issues.port.js';
import type { GithubIssue, GithubIssuesPort } from '../ports/github-issues.port.js';

@Injectable()
export class ListGithubIssuesUseCase {
  constructor(
    private readonly connections: ProfileConnectionRepository,
    @Inject(SECRET_CIPHER) private readonly cipher: SecretCipherPort,
    @Inject(GITHUB_ISSUES) private readonly github: GithubIssuesPort,
  ) {}

  async execute(input: { userId: string; page: number; pageSize: number }): Promise<{
    issues: GithubIssue[];
    page: number;
    pageSize: number;
    hasNext: boolean;
  }> {
    const connection = (await this.connections.findConnections(input.userId)).find(
      (candidate) => candidate.provider === 'github' && candidate.accessTokenCiphertext,
    );
    if (!connection?.accessTokenCiphertext) throw new NotFoundError('GitHub connection was not found');

    const accessToken = this.cipher.decrypt(connection.accessTokenCiphertext);
    const result = await this.github.listIssues(accessToken, { page: input.page, pageSize: input.pageSize });
    return { ...result, page: input.page, pageSize: input.pageSize };
  }
}
