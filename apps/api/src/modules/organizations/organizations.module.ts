import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuditModule } from '../../common/audit/audit.module.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { SecurityModule } from '../../common/security/security.module.js';
import { OrganizationInvitationOrmEntity } from './infrastructure/persistence/organization-invitation.orm-entity.js';
import { OrganizationMemberOrmEntity } from './infrastructure/persistence/organization-member.orm-entity.js';
import { OrganizationOrmEntity } from './infrastructure/persistence/organization.orm-entity.js';
import { OrganizationRoleOrmEntity } from './infrastructure/persistence/organization-role.orm-entity.js';
import { OrganizationService } from './application/organization.service.js';
import { CreateOrganizationRoleUseCase } from './application/use-cases/create-organization-role-use-case.js';
import { DeleteOrganizationRoleUseCase } from './application/use-cases/delete-organization-role-use-case.js';
import { ListOrganizationRolesUseCase } from './application/use-cases/list-organization-roles-use-case.js';
import { UpdateOrganizationRoleUseCase } from './application/use-cases/update-organization-role-use-case.js';
import { OrganizationsController } from './presentation/organizations.controller.js';

@Module({
  imports: [AuthModule, AuditModule, DatabaseModule, SecurityModule, MikroOrmModule.forFeature([OrganizationOrmEntity, OrganizationMemberOrmEntity, OrganizationInvitationOrmEntity, OrganizationRoleOrmEntity])],
  controllers: [OrganizationsController],
  providers: [
    OrganizationService,
    ListOrganizationRolesUseCase,
    CreateOrganizationRoleUseCase,
    UpdateOrganizationRoleUseCase,
    DeleteOrganizationRoleUseCase,
  ],
  exports: [OrganizationService],
})
export class OrganizationsModule {}
