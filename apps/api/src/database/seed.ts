import 'reflect-metadata';
import 'dotenv/config';
import { MikroORM } from '@mikro-orm/postgresql';
import config from '../../mikro-orm.config.js';
import { AccessStatus, UserRole } from '../modules/users/domain/user.js';
import { UserOrmEntity } from '../modules/users/infrastructure/persistence/user.orm-entity.js';
import { ProfileOrmEntity } from '../modules/users/infrastructure/persistence/profile.orm-entity.js';
import { ConnectionOrmEntity } from '../modules/auth/infrastructure/persistence/connection.orm-entity.js';
import { OrganizationOrmEntity } from '../modules/organizations/infrastructure/persistence/organization.orm-entity.js';
import { OrganizationMemberOrmEntity } from '../modules/organizations/infrastructure/persistence/organization-member.orm-entity.js';
import { OrganizationMemberRole, OrganizationMemberStatus, OrganizationStatus, OrganizationType } from '../modules/organizations/domain/organization.js';

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
if (!user) throw new Error('Admin user could not be initialized');
let profile = await em.findOne(ProfileOrmEntity, { userId: user.id });
if (!profile) {
  profile = em.create(ProfileOrmEntity, { userId: user.id, displayName: user.name, avatarUrl: user.avatarUrl });
  em.persist(profile);
}
let personal = await em.findOne(OrganizationOrmEntity, { ownerId: user.id, type: OrganizationType.PERSONAL });
if (!personal) {
  personal = em.create(OrganizationOrmEntity, {
    ownerId: user.id,
    name: `${user.name || user.githubLogin} Personal Workspace`,
    slug: `personal-${user.id}`,
    type: OrganizationType.PERSONAL,
    status: OrganizationStatus.ACTIVE,
  });
  em.persist(personal);
}
const member = await em.findOne(OrganizationMemberOrmEntity, { organizationId: personal.id, userId: user.id });
if (!member) {
  em.persist(em.create(OrganizationMemberOrmEntity, {
    organizationId: personal.id,
    userId: user.id,
    role: OrganizationMemberRole.OWNER,
    status: OrganizationMemberStatus.ACTIVE,
  }));
}
const connection = await em.findOne(ConnectionOrmEntity, { provider: 'GITHUB', providerAccountId: githubUserId });
if (!connection) {
  em.persist(em.create(ConnectionOrmEntity, {
    userId: user.id,
    provider: 'GITHUB',
    providerAccountId: githubUserId,
    providerUsername: user.githubLogin,
  }));
}
await em.flush();
await orm.close(true);
console.log(`Admin ready for GitHub user ${githubUserId}`);
