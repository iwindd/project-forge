import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import type { OAuthAccountRepository } from '../../application/ports/oauth-account.repository.js';
import type { OAuthAccountRecord } from '../../domain/oauth-account.js';
import { OAuthAccountOrmEntity } from './oauth-account.orm-entity.js';

@Injectable()
export class MikroOrmOAuthAccountRepository implements OAuthAccountRepository {
  constructor(private readonly em: EntityManager) {}

  async findByProviderAccount(provider: 'GITHUB', providerAccountId: string): Promise<OAuthAccountRecord | null> {
    const account = await this.em.findOne(OAuthAccountOrmEntity, { provider, providerAccountId });
    return account ? toRecord(account) : null;
  }

  async save(account: OAuthAccountRecord): Promise<void> {
    const entity = await this.em.findOne(OAuthAccountOrmEntity, { id: account.id });
    if (!entity) {
      this.em.persist(
        this.em.create(OAuthAccountOrmEntity, {
          id: account.id,
          userId: account.userId,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          accessTokenCiphertext: account.accessTokenCiphertext,
          scope: account.scope,
          expiresAt: account.expiresAt,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        }),
      );
      return;
    }
    entity.userId = account.userId;
    entity.provider = account.provider;
    entity.providerAccountId = account.providerAccountId;
    entity.accessTokenCiphertext = account.accessTokenCiphertext;
    entity.scope = account.scope;
    entity.expiresAt = account.expiresAt;
    entity.createdAt = account.createdAt;
    entity.updatedAt = account.updatedAt;
    this.em.persist(entity);
  }
}

function toRecord(account: OAuthAccountOrmEntity): OAuthAccountRecord {
  return {
    id: account.id,
    userId: account.userId,
    provider: 'GITHUB',
    providerAccountId: account.providerAccountId,
    accessTokenCiphertext: account.accessTokenCiphertext,
    scope: account.scope,
    expiresAt: account.expiresAt,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}
