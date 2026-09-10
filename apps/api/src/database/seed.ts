import { MikroORM } from '@mikro-orm/postgresql'
import 'dotenv/config'
import 'reflect-metadata'
import config from '../../mikro-orm.config.js'
import { ConnectionOrmEntity } from '../modules/auth/infrastructure/persistence/connection.orm-entity.js'
import {
  createOrganizationRole,
  ORGANIZATION_PERMISSIONS,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  OrganizationStatus,
  OrganizationType
} from '../modules/organizations/domain/organization.js'
import { OrganizationMemberOrmEntity } from '../modules/organizations/infrastructure/persistence/organization-member.orm-entity.js'
import { OrganizationRoleOrmEntity } from '../modules/organizations/infrastructure/persistence/organization-role.orm-entity.js'
import { OrganizationOrmEntity } from '../modules/organizations/infrastructure/persistence/organization.orm-entity.js'
import { AccessStatus, UserRole } from '../modules/users/domain/user.js'
import { ProfileOrmEntity } from '../modules/users/infrastructure/persistence/profile.orm-entity.js'
import { UserOrmEntity } from '../modules/users/infrastructure/persistence/user.orm-entity.js'

const githubUserId = process.env.SEED_ADMIN_GITHUB_ID?.trim()
if (!githubUserId) throw new Error('SEED_ADMIN_GITHUB_ID is required')

const orm = await MikroORM.init(config)
const em = orm.em.fork()
const user = await em.findOne(UserOrmEntity, { githubUserId })
if (user) {
  user.role = UserRole.ADMIN
  user.accessStatus = AccessStatus.APPROVED
  user.isActive = true
} else {
  em.persist(
    em.create(UserOrmEntity, {
      githubUserId,
      githubLogin: process.env.SEED_ADMIN_GITHUB_LOGIN?.trim() || 'admin',
      name: process.env.SEED_ADMIN_NAME?.trim() || 'Project Forge Admin',
      role: UserRole.ADMIN,
      accessStatus: AccessStatus.APPROVED,
      isActive: true
    })
  )
}
if (!user) throw new Error('Admin user could not be initialized')
let profile = await em.findOne(ProfileOrmEntity, { userId: user.id })
if (!profile) {
  profile = em.create(ProfileOrmEntity, {
    userId: user.id,
    displayName: user.name,
    avatarUrl: user.avatarUrl
  })
  em.persist(profile)
}
let personal = await em.findOne(OrganizationOrmEntity, {
  ownerId: user.id,
  type: OrganizationType.PERSONAL
})
if (!personal) {
  personal = em.create(OrganizationOrmEntity, {
    ownerId: user.id,
    name: `${user.name || user.githubLogin} Personal Workspace`,
    slug: `personal-${user.id}`,
    type: OrganizationType.PERSONAL,
    status: OrganizationStatus.ACTIVE
  })
  em.persist(personal)
}
const member = await em.findOne(OrganizationMemberOrmEntity, {
  organizationId: personal.id,
  userId: user.id
})
let ownerRole = await em.findOne(OrganizationRoleOrmEntity, {
  organizationId: personal.id,
  isOwner: true
})
if (!ownerRole) {
  ownerRole = em.create(
    OrganizationRoleOrmEntity,
    createOrganizationRole({
      organizationId: personal.id,
      name: 'เจ้าของ',
      permissions: [ORGANIZATION_PERMISSIONS.MANAGE],
      isOwner: true,
      legacyRole: OrganizationMemberRole.OWNER
    })
  )
  em.persist(ownerRole)
}
if (!member) {
  em.persist(
    em.create(OrganizationMemberOrmEntity, {
      organizationId: personal.id,
      userId: user.id,
      role: OrganizationMemberRole.OWNER,
      roleId: ownerRole.id,
      status: OrganizationMemberStatus.ACTIVE
    })
  )
} else if (!member.roleId) {
  member.roleId = ownerRole.id
  member.role = OrganizationMemberRole.OWNER
  em.persist(member)
}
const connection = await em.findOne(ConnectionOrmEntity, {
  provider: 'GITHUB',
  providerAccountId: githubUserId
})
if (!connection) {
  em.persist(
    em.create(ConnectionOrmEntity, {
      userId: user.id,
      provider: 'GITHUB',
      providerAccountId: githubUserId,
      providerUsername: user.githubLogin
    })
  )
}
await em.flush()
await orm.close(true)
console.log(`Admin ready for GitHub user ${githubUserId}`)
