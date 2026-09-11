import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AUDIT_LOGGER } from './audit.port.js';
import { AUDIT_QUERY } from './audit-query.port.js';
import { AuditLogOrmEntity } from './audit-log.orm-entity.js';
import { MikroOrmAuditAdapter } from './mikro-orm-audit.adapter.js';
import { MikroOrmAuditQueryAdapter } from './mikro-orm-audit-query.adapter.js';

@Module({
  imports: [MikroOrmModule.forFeature([AuditLogOrmEntity])],
  providers: [
    { provide: AUDIT_LOGGER, useClass: MikroOrmAuditAdapter },
    { provide: AUDIT_QUERY, useClass: MikroOrmAuditQueryAdapter },
  ],
  exports: [AUDIT_LOGGER, AUDIT_QUERY],
})
export class AuditModule {}
