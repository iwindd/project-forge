import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { ConnectionOrmEntity } from '../../../auth/infrastructure/persistence/connection.orm-entity.js';
import { AccessStatus } from '../../../users/domain/user.js';
import { UserOrmEntity } from '../../../users/infrastructure/persistence/user.orm-entity.js';
import {
  ForbiddenError,
  NotFoundError,
} from '../../../../common/errors/application-error.js';
import type {
  OrganizationMemberQuery,
  OrganizationMemberQueryRecord,
} from '../../application/ports/organization-member.query.js';
import {
  ORGANIZATION_PERMISSIONS,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  OrganizationStatus,
} from '../../domain/organization.js';
import { OrganizationMemberOrmEntity } from './organization-member.orm-entity.js';
import { OrganizationOrmEntity } from './organization.orm-entity.js';
import { OrganizationRoleOrmEntity } from './organization-role.orm-entity.js';

@Injectable()
export class MikroOrmOrganizationMemberQuery implements OrganizationMemberQuery {
  constructor(private readonly em: EntityManager) {}

  async list(userId: string, organizationId: string): Promise<OrganizationMemberQueryRecord[]> {
    const organization = await this.em.findOne(OrganizationOrmEntity, {
      id: organizationId,
      status: OrganizationStatus.ACTIVE,
    });
    if (!organization) throw new NotFoundError('Organization was not found');

    const membership = await this.em.findOne(OrganizationMemberOrmEntity, {
      organizationId,
      userId,
      status: OrganizationMemberStatus.ACTIVE,
    });
    if (!membership) throw new ForbiddenError('You are not a member of this organization');

    const members = await this.em.find(
      OrganizationMemberOrmEntity,
      { organizationId, status: { $ne: OrganizationMemberStatus.REMOVED } },
      { orderBy: { joinedAt: 'ASC' } },
    );
    const userIds = members.map((member) => member.userId);
    const users = userIds.length
      ? await this.em.find(UserOrmEntity, { id: { $in: userIds } })
      : [];
    const connections = userIds.length
      ? await this.em.find(ConnectionOrmEntity, {
          userId: { $in: userIds },
          provider: 'GITHUB',
        })
      : [];
    const roles = await this.em.find(OrganizationRoleOrmEntity, { organizationId });
    const roleMap = new Map(roles.map((role) => [role.id, role]));
    const legacyRoleMap = new Map(
      roles
        .filter((role) => role.legacyRole)
        .map((role) => [role.legacyRole as OrganizationMemberRole, role]),
    );
    const userMap = new Map(users.map((user) => [user.id, user]));
    const emailMap = new Map(
      connections.map((connection) => [connection.userId, connection.providerEmail]),
    );

    return members.map((member) => {
      const user = userMap.get(member.userId);
      const role = roleView(
        roleMap.get(member.roleId ?? '') ?? legacyRoleMap.get(member.role),
        member.role,
      );
      return {
        id: member.userId,
        membershipId: member.id,
        name: user?.name ?? user?.githubLogin ?? 'Unknown user',
        email: emailMap.get(member.userId) ?? user?.githubLogin ?? null,
        role,
        status: member.status,
        isActive:
          member.status === OrganizationMemberStatus.ACTIVE &&
          Boolean(user?.isActive && user.accessStatus !== AccessStatus.SUSPENDED),
        createdAt: user?.createdAt.toISOString() ?? member.joinedAt.toISOString(),
        updatedAt: user?.updatedAt.toISOString() ?? member.updatedAt.toISOString(),
      };
    });
  }
}

function roleView(
  role: OrganizationRoleOrmEntity | undefined,
  legacyRole: OrganizationMemberRole,
): OrganizationMemberQueryRecord['role'] {
  if (role) {
    return {
      id: role.id,
      name: role.name,
      permissions: role.permissions,
      isOwner: role.isOwner,
      legacyRole: role.legacyRole ?? (role.isOwner ? OrganizationMemberRole.OWNER : null),
    };
  }

  return {
    id: null,
    name:
      legacyRole === OrganizationMemberRole.OWNER
        ? 'เจ้าของ'
        : legacyRole === OrganizationMemberRole.ADMIN
          ? 'แอดมิน'
          : 'สมาชิก',
    permissions:
      legacyRole === OrganizationMemberRole.ADMIN || legacyRole === OrganizationMemberRole.OWNER
        ? [ORGANIZATION_PERMISSIONS.MANAGE]
        : [],
    isOwner: legacyRole === OrganizationMemberRole.OWNER,
    legacyRole,
  };
}
