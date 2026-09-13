import { MikroORM } from '@mikro-orm/postgresql';
import 'dotenv/config';
import 'reflect-metadata';
import config from '../../mikro-orm.config.js';
import { ConnectionOrmEntity } from '../modules/auth/infrastructure/persistence/connection.orm-entity.js';
import {
  createOrganizationRole,
  ORGANIZATION_PERMISSIONS,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  OrganizationStatus,
  OrganizationType,
} from '../modules/organizations/domain/organization.js';
import { OrganizationMemberOrmEntity } from '../modules/organizations/infrastructure/persistence/organization-member.orm-entity.js';
import { OrganizationRoleOrmEntity } from '../modules/organizations/infrastructure/persistence/organization-role.orm-entity.js';
import { OrganizationOrmEntity } from '../modules/organizations/infrastructure/persistence/organization.orm-entity.js';
import { AccessStatus, UserRole } from '../modules/users/domain/user.js';
import { ProfileOrmEntity } from '../modules/users/infrastructure/persistence/profile.orm-entity.js';
import { UserOrmEntity } from '../modules/users/infrastructure/persistence/user.orm-entity.js';

const githubUserId = process.env.SEED_ADMIN_GITHUB_ID?.trim();
if (!githubUserId) throw new Error('SEED_ADMIN_GITHUB_ID is required');

const orm = await MikroORM.init(config);
const em = orm.em.fork();
let user = await em.findOne(UserOrmEntity, { githubUserId });
if (user) {
  user.role = UserRole.ADMIN;
  user.accessStatus = AccessStatus.APPROVED;
  user.isActive = true;
} else {
  user = em.create(UserOrmEntity, {
    githubUserId,
    githubLogin: process.env.SEED_ADMIN_GITHUB_LOGIN?.trim() || 'admin',
    name: process.env.SEED_ADMIN_NAME?.trim() || 'Project Forge Admin',
    role: UserRole.ADMIN,
    accessStatus: AccessStatus.APPROVED,
    isActive: true,
  });
  em.persist(user);
}
if (!user) throw new Error('Admin user could not be initialized');
await em.flush();
let profile = await em.findOne(ProfileOrmEntity, { userId: user.id });
if (!profile) {
  profile = em.create(ProfileOrmEntity, {
    userId: user.id,
    displayName: user.name,
    avatarUrl: user.avatarUrl,
  });
  em.persist(profile);
}
const organizationName = process.env.SEED_ORGANIZATION_NAME?.trim() || 'Project Forge';
const organizationSlug = process.env.SEED_ORGANIZATION_SLUG?.trim() || 'project-forge';
let organization = await em.findOne(OrganizationOrmEntity, { slug: organizationSlug });
if (!organization) {
  organization = em.create(OrganizationOrmEntity, {
    name: organizationName,
    slug: organizationSlug,
    type: OrganizationType.SHARED,
    status: OrganizationStatus.ACTIVE,
  });
  em.persist(organization);
}
await em.flush();
const builtInRoles = [
  {
    name: 'เจ้าของ',
    permissions: [ORGANIZATION_PERMISSIONS.MANAGE, ORGANIZATION_PERMISSIONS.MANAGE_PROJECT],
    isOwner: true,
    code: OrganizationMemberRole.OWNER,
  },
  {
    name: 'แอดมิน',
    permissions: [ORGANIZATION_PERMISSIONS.MANAGE, ORGANIZATION_PERMISSIONS.MANAGE_PROJECT],
    isOwner: false,
    code: OrganizationMemberRole.ADMIN,
  },
  {
    name: 'สมาชิก',
    permissions: [],
    isOwner: false,
    code: OrganizationMemberRole.MEMBER,
  },
] as const;
const roles: OrganizationRoleOrmEntity[] = [];
for (const definition of builtInRoles) {
  let role = await em.findOne(OrganizationRoleOrmEntity, {
    organizationId: organization.id,
    code: definition.code,
  });
  if (!role) {
    role = em.create(
      OrganizationRoleOrmEntity,
      createOrganizationRole({
        organizationId: organization.id,
        name: definition.name,
        permissions: [...definition.permissions],
        isOwner: definition.isOwner,
        code: definition.code,
      }),
    );
    em.persist(role);
  }
  roles.push(role);
}
const ownerRole = roles.find((role) => role.code === OrganizationMemberRole.OWNER);
if (!ownerRole) throw new Error('Seed Owner role could not be initialized');
const existingOwner = await em.findOne(OrganizationMemberOrmEntity, {
  organizationId: organization.id,
  roleId: ownerRole.id,
  status: OrganizationMemberStatus.ACTIVE,
});
if (existingOwner && existingOwner.userId !== user.id) {
  throw new Error('Seed organization already has a different Owner');
}
const member = await em.findOne(OrganizationMemberOrmEntity, {
  organizationId: organization.id,
  userId: user.id,
});
if (!member) {
  em.persist(
    em.create(OrganizationMemberOrmEntity, {
      organizationId: organization.id,
      userId: user.id,
      roleId: ownerRole.id,
      status: OrganizationMemberStatus.ACTIVE,
    }),
  );
} else if (member.roleId !== ownerRole.id || member.status !== OrganizationMemberStatus.ACTIVE) {
  member.roleId = ownerRole.id;
  member.status = OrganizationMemberStatus.ACTIVE;
  em.persist(member);
}
const connection = await em.findOne(ConnectionOrmEntity, {
  provider: 'GITHUB',
  providerAccountId: githubUserId,
});
if (!connection) {
  em.persist(
    em.create(ConnectionOrmEntity, {
      userId: user.id,
      provider: 'GITHUB',
      providerAccountId: githubUserId,
      providerUsername: user.githubLogin,
    }),
  );
}
await em.flush();
await orm.close(true);
console.log(`Admin ready for GitHub user ${githubUserId}`);
