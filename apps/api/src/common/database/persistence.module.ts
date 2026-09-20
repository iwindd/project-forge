import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { MikroOrmSessionRepository } from '../../modules/auth/infrastructure/persistence/mikro-orm-session.repository.js';
import { SessionOrmEntity } from '../../modules/auth/infrastructure/persistence/session.orm-entity.js';
import { SESSION_REPOSITORY } from '../../modules/auth/application/ports/session.repository.js';
import { HermesSessionOrmEntity } from '../../modules/hermes-runtime/infrastructure/persistence/hermes-session.orm-entity.js';
import { MikroOrmHermesSessionRepository } from '../../modules/hermes-runtime/infrastructure/persistence/mikro-orm-hermes-session.repository.js';
import { HERMES_SESSION_REPOSITORY } from '../../modules/hermes-runtime/domain/hermes-session.types.js';
import { MikroOrmProjectRepository } from '../../modules/projects/infrastructure/persistence/mikro-orm-project.repository.js';
import { ProjectOrmEntity } from '../../modules/projects/infrastructure/persistence/project.orm-entity.js';
import { PROJECT_REPOSITORY } from '../../modules/projects/application/ports/project.repository.js';
import { MikroOrmUserRepository } from '../../modules/users/infrastructure/persistence/mikro-orm-user.repository.js';
import { UserOrmEntity } from '../../modules/users/infrastructure/persistence/user.orm-entity.js';
import { ProfileOrmEntity } from '../../modules/users/infrastructure/persistence/profile.orm-entity.js';
import { OrganizationInvitationOrmEntity } from '../../modules/organizations/infrastructure/persistence/organization-invitation.orm-entity.js';
import { OrganizationMemberOrmEntity } from '../../modules/organizations/infrastructure/persistence/organization-member.orm-entity.js';
import { OrganizationOrmEntity } from '../../modules/organizations/infrastructure/persistence/organization.orm-entity.js';
import { ConnectionOrmEntity } from '../../modules/auth/infrastructure/persistence/connection.orm-entity.js';
import { USER_REPOSITORY } from '../../modules/users/application/ports/user.repository.js';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      UserOrmEntity,
      ProfileOrmEntity,
      ConnectionOrmEntity,
      OrganizationOrmEntity,
      OrganizationMemberOrmEntity,
      OrganizationInvitationOrmEntity,
      SessionOrmEntity,
      ProjectOrmEntity,
      HermesSessionOrmEntity,
    ]),
  ],
  providers: [
    { provide: USER_REPOSITORY, useClass: MikroOrmUserRepository },
    { provide: SESSION_REPOSITORY, useClass: MikroOrmSessionRepository },
    { provide: PROJECT_REPOSITORY, useClass: MikroOrmProjectRepository },
    { provide: HERMES_SESSION_REPOSITORY, useClass: MikroOrmHermesSessionRepository },
  ],
  exports: [USER_REPOSITORY, SESSION_REPOSITORY, PROJECT_REPOSITORY, HERMES_SESSION_REPOSITORY],
})
export class PersistenceModule {}
