import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AccessRequestOrmEntity } from '../../modules/access-requests/infrastructure/persistence/access-request.orm-entity.js';
import { MikroOrmAccessRequestRepository } from '../../modules/access-requests/infrastructure/persistence/mikro-orm-access-request.repository.js';
import { ACCESS_REQUEST_REPOSITORY } from '../../modules/access-requests/application/ports/access-request.repository.js';
import { MikroOrmOAuthAccountRepository } from '../../modules/auth/infrastructure/persistence/mikro-orm-oauth-account.repository.js';
import { OAuthAccountOrmEntity } from '../../modules/auth/infrastructure/persistence/oauth-account.orm-entity.js';
import { MikroOrmSessionRepository } from '../../modules/auth/infrastructure/persistence/mikro-orm-session.repository.js';
import { SessionOrmEntity } from '../../modules/auth/infrastructure/persistence/session.orm-entity.js';
import { OAUTH_ACCOUNT_REPOSITORY } from '../../modules/auth/application/ports/oauth-account.repository.js';
import { SESSION_REPOSITORY } from '../../modules/auth/application/ports/session.repository.js';
import { MikroOrmProjectMemberRepository } from '../../modules/projects/infrastructure/persistence/mikro-orm-project-member.repository.js';
import { ProjectMemberOrmEntity } from '../../modules/projects/infrastructure/persistence/project-member.orm-entity.js';
import { MikroOrmProjectRepository } from '../../modules/projects/infrastructure/persistence/mikro-orm-project.repository.js';
import { ProjectOrmEntity } from '../../modules/projects/infrastructure/persistence/project.orm-entity.js';
import { PROJECT_MEMBER_REPOSITORY } from '../../modules/projects/application/ports/project-member.repository.js';
import { PROJECT_REPOSITORY } from '../../modules/projects/application/ports/project.repository.js';
import { MikroOrmUserRepository } from '../../modules/users/infrastructure/persistence/mikro-orm-user.repository.js';
import { UserOrmEntity } from '../../modules/users/infrastructure/persistence/user.orm-entity.js';
import { USER_REPOSITORY } from '../../modules/users/application/ports/user.repository.js';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      UserOrmEntity,
      OAuthAccountOrmEntity,
      SessionOrmEntity,
      AccessRequestOrmEntity,
      ProjectOrmEntity,
      ProjectMemberOrmEntity,
    ]),
  ],
  providers: [
    { provide: USER_REPOSITORY, useClass: MikroOrmUserRepository },
    { provide: OAUTH_ACCOUNT_REPOSITORY, useClass: MikroOrmOAuthAccountRepository },
    { provide: SESSION_REPOSITORY, useClass: MikroOrmSessionRepository },
    { provide: ACCESS_REQUEST_REPOSITORY, useClass: MikroOrmAccessRequestRepository },
    { provide: PROJECT_REPOSITORY, useClass: MikroOrmProjectRepository },
    { provide: PROJECT_MEMBER_REPOSITORY, useClass: MikroOrmProjectMemberRepository },
  ],
  exports: [
    USER_REPOSITORY,
    OAUTH_ACCOUNT_REPOSITORY,
    SESSION_REPOSITORY,
    ACCESS_REQUEST_REPOSITORY,
    PROJECT_REPOSITORY,
    PROJECT_MEMBER_REPOSITORY,
  ],
})
export class PersistenceModule {}
