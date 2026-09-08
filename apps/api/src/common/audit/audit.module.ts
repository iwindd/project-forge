import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AUDIT_LOGGER } from './audit.port.js';
import { AuditLogOrmEntity } from './audit-log.orm-entity.js';
import { MikroOrmAuditAdapter } from './mikro-orm-audit.adapter.js';

@Module({
  imports: [MikroOrmModule.forFeature([AuditLogOrmEntity])],
  providers: [{ provide: AUDIT_LOGGER, useClass: MikroOrmAuditAdapter }],
  exports: [AUDIT_LOGGER],
})
export class AuditModule {}
