import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import type { AuditLogInput, AuditLogPort } from './audit.port.js';
import { AuditLogOrmEntity } from './audit-log.orm-entity.js';

@Injectable()
export class MikroOrmAuditAdapter implements AuditLogPort {
  constructor(private readonly em: EntityManager) {}

  async record(input: AuditLogInput): Promise<void> {
    this.em.persist(
      this.em.create(AuditLogOrmEntity, {
        organizationId: input.organizationId ?? null,
        actorId: input.actorId ?? null,
        targetUserId: input.targetUserId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        beforeJson: input.before ?? null,
        afterJson: input.after ?? null,
        reason: input.reason ?? null,
        requestId: input.requestId ?? null,
      }),
    );
    await this.em.flush();
  }
}
