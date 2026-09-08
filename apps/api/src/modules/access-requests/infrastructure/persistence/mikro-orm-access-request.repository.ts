import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import type { AccessRequestRepository } from '../../application/ports/access-request.repository.js';
import { AccessRequestStatus, type AccessRequestRecord } from '../../domain/access-request.js';
import { AccessRequestOrmEntity } from './access-request.orm-entity.js';

@Injectable()
export class MikroOrmAccessRequestRepository implements AccessRequestRepository {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<AccessRequestRecord | null> {
    const request = await this.em.findOne(AccessRequestOrmEntity, { id });
    return request ? toRecord(request) : null;
  }

  async findPendingByUserId(userId: string): Promise<AccessRequestRecord | null> {
    const request = await this.em.findOne(AccessRequestOrmEntity, {
      userId,
      status: AccessRequestStatus.PENDING,
    });
    return request ? toRecord(request) : null;
  }

  async findByUserId(userId: string): Promise<AccessRequestRecord[]> {
    const requests = await this.em.find(AccessRequestOrmEntity, { userId }, { orderBy: { createdAt: 'desc' } });
    return requests.map(toRecord);
  }

  async findAll(): Promise<AccessRequestRecord[]> {
    const requests = await this.em.find(AccessRequestOrmEntity, {}, { orderBy: { createdAt: 'desc' } });
    return requests.map(toRecord);
  }

  async save(request: AccessRequestRecord): Promise<void> {
    const entity = await this.em.findOne(AccessRequestOrmEntity, { id: request.id });
    if (!entity) {
      this.em.persist(
        this.em.create(AccessRequestOrmEntity, {
          id: request.id,
          userId: request.userId,
          reason: request.reason,
          status: request.status,
          reviewedBy: request.reviewedBy,
          reviewedAt: request.reviewedAt,
          reviewNote: request.reviewNote,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
        }),
      );
      return;
    }
    entity.userId = request.userId;
    entity.reason = request.reason;
    entity.status = request.status;
    entity.reviewedBy = request.reviewedBy;
    entity.reviewedAt = request.reviewedAt;
    entity.reviewNote = request.reviewNote;
    entity.createdAt = request.createdAt;
    entity.updatedAt = request.updatedAt;
    this.em.persist(entity);
  }
}

function toRecord(request: AccessRequestOrmEntity): AccessRequestRecord {
  return {
    id: request.id,
    userId: request.userId,
    reason: request.reason,
    status: request.status,
    reviewedBy: request.reviewedBy,
    reviewedAt: request.reviewedAt,
    reviewNote: request.reviewNote,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}
