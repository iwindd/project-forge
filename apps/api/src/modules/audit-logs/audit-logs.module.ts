import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AuditLogOrmEntity } from '../../common/audit/audit-log.orm-entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { UserOrmEntity } from '../users/infrastructure/persistence/user.orm-entity.js';
import { AuditLogsController } from './presentation/audit-logs.controller.js';

@Module({
  imports: [AuthModule, MikroOrmModule.forFeature([AuditLogOrmEntity, UserOrmEntity])],
  controllers: [AuditLogsController],
})
export class AuditLogsModule {}
