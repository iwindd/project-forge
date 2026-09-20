import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import type { HermesSessionRepositoryPort } from '../../application/ports/hermes-session.repository.js';
import type { HermesSessionRecord } from '../../domain/hermes-session.types.js';
import { HermesSessionOrmEntity } from './hermes-session.orm-entity.js';

@Injectable()
export class MikroOrmHermesSessionRepository implements HermesSessionRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  async listForUser(userId: string): Promise<HermesSessionRecord[]> {
    const rows = await this.em.find(HermesSessionOrmEntity, { userId }, { orderBy: { updatedAt: 'desc' } });
    return rows.map(toRecord);
  }

  async findByIdForUser(userId: string, id: string): Promise<HermesSessionRecord | null> {
    const row = await this.em.findOne(HermesSessionOrmEntity, { id, userId });
    return row ? toRecord(row) : null;
  }

  async create(record: HermesSessionRecord): Promise<void> {
    this.em.persist(
      this.em.create(HermesSessionOrmEntity, {
        id: record.id,
        userId: record.userId,
        agentHandle: record.agentHandle,
        hermesSessionId: record.hermesSessionId,
        closedAt: record.closedAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      }),
    );
    await this.em.flush();
  }

  async replaceRuntimeSession(userId: string, id: string, hermesSessionId: string, updatedAt: Date): Promise<void> {
    const row = await this.em.findOne(HermesSessionOrmEntity, { id, userId });
    if (!row) return;
    row.hermesSessionId = hermesSessionId;
    row.closedAt = null;
    row.updatedAt = updatedAt;
    await this.em.flush();
  }

  async markOpened(userId: string, id: string, openedAt: Date): Promise<void> {
    const row = await this.em.findOne(HermesSessionOrmEntity, { id, userId });
    if (!row) return;
    row.closedAt = null;
    row.updatedAt = openedAt;
    await this.em.flush();
  }

  async markClosed(userId: string, id: string, closedAt: Date): Promise<void> {
    const row = await this.em.findOne(HermesSessionOrmEntity, { id, userId });
    if (!row) return;
    row.closedAt = closedAt;
    row.updatedAt = closedAt;
    await this.em.flush();
  }
}

function toRecord(row: HermesSessionOrmEntity): HermesSessionRecord {
  return {
    id: row.id,
    userId: row.userId,
    agentHandle: row.agentHandle,
    hermesSessionId: row.hermesSessionId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    closedAt: row.closedAt,
  };
}
