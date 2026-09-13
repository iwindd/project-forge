import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { OrganizationsModule } from '../organizations/organizations.module.js';
import { SecurityModule } from '../../common/security/security.module.js';
import { UserSecurityLogOrmEntity } from '../../common/security/user-security-log.orm-entity.js';
import { AuditLogsController } from './presentation/audit-logs.controller.js';

@Module({
  imports: [AuthModule, AuditModule, OrganizationsModule, SecurityModule, MikroOrmModule.forFeature([UserSecurityLogOrmEntity])],
  controllers: [AuditLogsController],
})
export class AuditLogsModule {}
