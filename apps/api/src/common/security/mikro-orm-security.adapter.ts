import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import type { SecurityLogInput, SecurityLogPort } from './security-log.port.js';
import { UserSecurityLogOrmEntity } from './user-security-log.orm-entity.js';

@Injectable()
export class MikroOrmSecurityAdapter implements SecurityLogPort {
  constructor(private readonly em: EntityManager) {}

  async record(input: SecurityLogInput): Promise<void> {
    this.em.persist(
      this.em.create(UserSecurityLogOrmEntity, {
        organizationId: input.organizationId ?? null,
        userId: input.userId ?? null,
        event: input.event,
        provider: input.provider ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: input.metadata ?? null,
      }),
    );
    await this.em.flush();
  }
}
