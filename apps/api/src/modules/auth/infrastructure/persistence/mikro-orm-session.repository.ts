import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import type { SessionRepository } from '../../application/ports/session.repository.js';
import type { SessionRecord } from '../../domain/session.js';
import { SessionOrmEntity } from './session.orm-entity.js';

@Injectable()
export class MikroOrmSessionRepository implements SessionRepository {
  constructor(private readonly em: EntityManager) {}

  async findActiveByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const session = await this.em.findOne(SessionOrmEntity, { tokenHash, revokedAt: null });
    return session ? toRecord(session) : null;
  }

  async save(session: SessionRecord): Promise<void> {
    const entity = await this.em.findOne(SessionOrmEntity, { id: session.id });
    if (!entity) return;
    entity.userId = session.userId;
    entity.tokenHash = session.tokenHash;
    entity.expiresAt = session.expiresAt;
    entity.revokedAt = session.revokedAt;
    entity.createdAt = session.createdAt;
    entity.lastSeenAt = session.lastSeenAt;
    this.em.persist(entity);
  }

  async create(session: SessionRecord): Promise<void> {
    const entity = this.em.create(SessionOrmEntity, {
      id: session.id,
      userId: session.userId,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
    });
    this.em.persist(entity);
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    const session = await this.em.findOne(SessionOrmEntity, { tokenHash, revokedAt: null });
    if (session) {
      session.revokedAt = new Date();
      this.em.persist(session);
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.em.nativeUpdate(SessionOrmEntity, { userId, revokedAt: null }, { revokedAt: new Date() });
  }

}

function toRecord(session: SessionOrmEntity): SessionRecord {
  return {
    id: session.id,
    userId: session.userId,
    tokenHash: session.tokenHash,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
  };
}
