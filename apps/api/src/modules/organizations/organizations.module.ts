import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuditModule } from '../../common/audit/audit.module.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { SecurityModule } from '../../common/security/security.module.js';
import { OrganizationInvitationOrmEntity } from './infrastructure/persistence/organization-invitation.orm-entity.js';
import { OrganizationMemberOrmEntity } from './infrastructure/persistence/organization-member.orm-entity.js';
import { OrganizationOrmEntity } from './infrastructure/persistence/organization.orm-entity.js';
import { OrganizationService } from './application/organization.service.js';
import { OrganizationsController } from './presentation/organizations.controller.js';

@Module({
  imports: [AuthModule, AuditModule, DatabaseModule, SecurityModule, MikroOrmModule.forFeature([OrganizationOrmEntity, OrganizationMemberOrmEntity, OrganizationInvitationOrmEntity])],
  controllers: [OrganizationsController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationsModule {}
