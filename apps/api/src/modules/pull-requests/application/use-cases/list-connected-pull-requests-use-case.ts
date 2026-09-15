import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors/application-error.js';
import { EntityManager } from '@mikro-orm/core';
import { SECRET_CIPHER, GITHUB_PULL_REQUESTS } from '../../../auth/application/ports/auth.ports.js';
import type {
  GithubPullRequestPage,
  GithubPullRequestPort,
  SecretCipherPort,
} from '../../../auth/application/ports/auth.ports.js';
import { ConnectionOrmEntity } from '../../../auth/infrastructure/persistence/connection.orm-entity.js';

@Injectable()
export class ListConnectedPullRequestsUseCase {
  constructor(
    private readonly em: EntityManager,
    @Inject(GITHUB_PULL_REQUESTS) private readonly github: GithubPullRequestPort,
    @Inject(SECRET_CIPHER) private readonly cipher: SecretCipherPort,
  ) {}

  async execute(userId: string, page: number, perPage: number): Promise<GithubPullRequestPage> {
    const connection = await this.em.findOne(ConnectionOrmEntity, { userId, provider: 'GITHUB' });
    if (!connection?.accessTokenCiphertext || !connection.providerUsername) {
      throw new NotFoundError('A GitHub connection was not found');
    }
    return this.github.list(
      this.cipher.decrypt(connection.accessTokenCiphertext),
      connection.providerUsername,
      page,
      perPage,
    );
  }
}
