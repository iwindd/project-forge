import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';

loadEnv();
if (!process.env.DATABASE_URL) loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { ReflectMetadataProvider } from '@mikro-orm/decorators/legacy';
import { AccessRequest } from './src/modules/access/access-request.entity.js';
import { AuditLog } from './src/modules/audit/audit-log.entity.js';
import { OAuthAccount } from './src/modules/auth/oauth-account.entity.js';
import { Session } from './src/modules/auth/session.entity.js';
import { ProjectMember } from './src/modules/projects/project-member.entity.js';
import { Project } from './src/modules/projects/project.entity.js';
import { User } from './src/modules/users/user.entity.js';

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,
  metadataProvider: ReflectMetadataProvider,
  entities: [User, OAuthAccount, Session, AccessRequest, AuditLog, Project, ProjectMember],
  extensions: [Migrator],
  migrations: {
    path: './dist/src/database/migrations',
    pathTs: './src/database/migrations',
  },
  debug: process.env.NODE_ENV === 'development',
});
