import 'reflect-metadata';
import 'dotenv/config';
import { MikroORM } from '@mikro-orm/postgresql';
import config from '../../mikro-orm.config.js';
import { AccessStatus, UserRole } from '../modules/users/domain/user.js';
import { UserOrmEntity } from '../modules/users/infrastructure/persistence/user.orm-entity.js';

const githubUserId = process.env.SEED_ADMIN_GITHUB_ID?.trim();
if (!githubUserId) throw new Error('SEED_ADMIN_GITHUB_ID is required');

const orm = await MikroORM.init(config);
const em = orm.em.fork();
const user = await em.findOne(UserOrmEntity, { githubUserId });
if (user) {
  user.role = UserRole.ADMIN;
  user.accessStatus = AccessStatus.APPROVED;
  user.isActive = true;
} else {
  em.persist(
    em.create(UserOrmEntity, {
      githubUserId,
      githubLogin: process.env.SEED_ADMIN_GITHUB_LOGIN?.trim() || 'admin',
      name: process.env.SEED_ADMIN_NAME?.trim() || 'Project Forge Admin',
      role: UserRole.ADMIN,
      accessStatus: AccessStatus.APPROVED,
      isActive: true,
    }),
  );
}
await em.flush();
await orm.close(true);
console.log(`Admin ready for GitHub user ${githubUserId}`);
