import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';

loadEnv();
if (!process.env.DATABASE_URL) loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { ReflectMetadataProvider } from '@mikro-orm/decorators/legacy';
import { AuditLogOrmEntity } from './src/common/audit/audit-log.orm-entity.js';
import { SessionOrmEntity } from './src/modules/auth/infrastructure/persistence/session.orm-entity.js';
import { ProjectOrmEntity } from './src/modules/projects/infrastructure/persistence/project.orm-entity.js';
import { UserOrmEntity } from './src/modules/users/infrastructure/persistence/user.orm-entity.js';
import { ProfileOrmEntity } from './src/modules/users/infrastructure/persistence/profile.orm-entity.js';
import { ConnectionOrmEntity } from './src/modules/auth/infrastructure/persistence/connection.orm-entity.js';
import { OrganizationInvitationOrmEntity } from './src/modules/organizations/infrastructure/persistence/organization-invitation.orm-entity.js';
import { OrganizationMemberOrmEntity } from './src/modules/organizations/infrastructure/persistence/organization-member.orm-entity.js';
import { OrganizationOrmEntity } from './src/modules/organizations/infrastructure/persistence/organization.orm-entity.js';
import { OrganizationRoleOrmEntity } from './src/modules/organizations/infrastructure/persistence/organization-role.orm-entity.js';
import { UserSecurityLogOrmEntity } from './src/common/security/user-security-log.orm-entity.js';
import { HermesSessionOrmEntity } from './src/modules/hermes-runtime/infrastructure/persistence/hermes-session.orm-entity.js';

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,
  metadataProvider: ReflectMetadataProvider,
  entities: [
    UserOrmEntity,
    ProfileOrmEntity,
    ConnectionOrmEntity,
    OrganizationOrmEntity,
    OrganizationMemberOrmEntity,
    OrganizationInvitationOrmEntity,
    OrganizationRoleOrmEntity,
    UserSecurityLogOrmEntity,
    SessionOrmEntity,
    AuditLogOrmEntity,
    ProjectOrmEntity,
    HermesSessionOrmEntity,
  ],
  extensions: [Migrator],
  migrations: {
    path: './dist/src/database/migrations',
    pathTs: './src/database/migrations',
  },
  debug: process.env.NODE_ENV === 'development',
});
