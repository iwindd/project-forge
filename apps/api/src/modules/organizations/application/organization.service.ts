import { EntityManager } from '@mikro-orm/core';
import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { AUDIT_LOGGER } from '../../../common/audit/audit.port.js';
import type { AuditLogPort } from '../../../common/audit/audit.port.js';
import { SECURITY_LOGGER } from '../../../common/security/security-log.port.js';
import type { SecurityLogPort } from '../../../common/security/security-log.port.js';
import {
  ConflictError,
  ForbiddenError,
  InvalidInputError,
  NotFoundError,
} from '../../../common/errors/application-error.js';
import { ConnectionOrmEntity } from '../../auth/infrastructure/persistence/connection.orm-entity.js';
import { AccessStatus } from '../../users/domain/user.js';
import { UserOrmEntity } from '../../users/infrastructure/persistence/user.orm-entity.js';
import {
  createOrganization,
  createOrganizationInvitation,
  createOrganizationMember,
  createOrganizationRole,
  ORGANIZATION_PERMISSIONS,
  OrganizationInvitationStatus,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  OrganizationStatus,
  OrganizationType,
  slugifyOrganizationName,
} from '../domain/organization.js';
import type { OrganizationPermission } from '../domain/organization.js';
import { OrganizationInvitationOrmEntity } from '../infrastructure/persistence/organization-invitation.orm-entity.js';
import { OrganizationMemberOrmEntity } from '../infrastructure/persistence/organization-member.orm-entity.js';
import { OrganizationOrmEntity } from '../infrastructure/persistence/organization.orm-entity.js';
import { OrganizationRoleOrmEntity } from '../infrastructure/persistence/organization-role.orm-entity.js';

export type OrganizationRoleView = {
  id: string | null;
  name: string;
  permissions: OrganizationPermission[];
  isOwner: boolean;
  legacyRole: OrganizationMemberRole | null;
};

type RoleInput = {
  roleId?: string;
  role?: OrganizationMemberRole;
};

const DEFAULT_ROLE_NAMES = {
  owner: 'เจ้าของ',
  admin: 'แอดมิน',
  member: 'สมาชิก',
} as const;

@Injectable()
export class OrganizationService {
  constructor(
    private readonly em: EntityManager,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogPort,
    @Inject(SECURITY_LOGGER) private readonly security: SecurityLogPort,
  ) {}

  async listForUser(userId: string) {
    const memberships = await this.em.find(
      OrganizationMemberOrmEntity,
      { userId, status: OrganizationMemberStatus.ACTIVE },
      { orderBy: { joinedAt: 'ASC' } },
    );
    if (!memberships.length) return [];
    const organizations = await this.em.find(OrganizationOrmEntity, {
      id: { $in: memberships.map((membership) => membership.organizationId) },
      status: OrganizationStatus.ACTIVE,
    });
    const roles = await this.em.find(OrganizationRoleOrmEntity, {
      organizationId: { $in: organizations.map((organization) => organization.id) },
    });
    const organizationMap = new Map(organizations.map((organization) => [organization.id, organization]));
    const roleMap = new Map(roles.map((role) => [role.id, role]));
    const legacyRoleMap = new Map(
      roles.filter((role) => role.legacyRole).map((role) => [`${role.organizationId}:${role.legacyRole}`, role]),
    );
    return memberships
      .map((membership) => {
        const organization = organizationMap.get(membership.organizationId);
        if (!organization) return null;
        return {
          organization,
          membership,
          role: this.roleView(
            roleMap.get(membership.roleId ?? '') ?? legacyRoleMap.get(`${membership.organizationId}:${membership.role}`),
            membership.role,
          ),
        };
      })
      .filter((value): value is {
        organization: OrganizationOrmEntity;
        membership: OrganizationMemberOrmEntity;
        role: OrganizationRoleView;
      } => value !== null);
  }

  async createShared(ownerId: string, name: string, requestedSlug?: string) {
    const normalizedName = name.trim();
    if (!normalizedName) throw new InvalidInputError('Organization name is required');
    const baseSlug = slugifyOrganizationName(requestedSlug?.trim() || normalizedName);
    const slug = await this.uniqueSlug(baseSlug);
    const organization = createOrganization({
      ownerId,
      name: normalizedName,
      slug,
      type: OrganizationType.SHARED,
    });
    const roles = this.createDefaultRoleRecords(organization.id, true);
    const ownerRole = roles.find((role) => role.isOwner);
    if (!ownerRole) throw new InvalidInputError('The organization owner role could not be initialized');
    const member = createOrganizationMember({
      organizationId: organization.id,
      userId: ownerId,
      role: OrganizationMemberRole.OWNER,
      roleId: ownerRole.id,
    });
    this.em.persist(this.em.create(OrganizationOrmEntity, organization));
    for (const role of roles) this.em.persist(this.em.create(OrganizationRoleOrmEntity, role));
    this.em.persist(this.em.create(OrganizationMemberOrmEntity, member));
    await this.audit.record({
      organizationId: organization.id,
      actorId: ownerId,
      targetUserId: ownerId,
      action: 'ORGANIZATION_CREATED',
      resourceType: 'ORGANIZATION',
      resourceId: organization.id,
      after: { name: organization.name, type: organization.type },
    });
    await this.em.flush();
    return organization;
  }

  async requireOrganization(organizationId: string) {
    const organization = await this.em.findOne(OrganizationOrmEntity, {
      id: organizationId,
      status: OrganizationStatus.ACTIVE,
    });
    if (!organization) throw new NotFoundError('Organization was not found');
    return organization;
  }

  async requireMembership(userId: string, organizationId: string) {
    const organization = await this.requireOrganization(organizationId);
    const membership = await this.em.findOne(OrganizationMemberOrmEntity, {
      organizationId,
      userId,
      status: OrganizationMemberStatus.ACTIVE,
    });
    if (!membership) throw new ForbiddenError('You are not a member of this organization');
    const role = await this.resolveMembershipRole(membership);
    return { organization, membership, role };
  }

  async requireManager(userId: string, organizationId: string) {
    const result = await this.requireMembership(userId, organizationId);
    if (result.organization.type === OrganizationType.PERSONAL) {
      throw new ForbiddenError('Personal Workspace cannot be managed as a shared organization');
    }
    if (!result.role.isOwner && !result.role.permissions.includes(ORGANIZATION_PERMISSIONS.MANAGE)) {
      throw new ForbiddenError('Organization management access is required');
    }
    return result;
  }

  async listRoles(actorId: string, organizationId: string) {
    await this.requireManager(actorId, organizationId);
    const organization = await this.requireOrganization(organizationId);
    const roles = await this.ensureDefaultRoles(organization);
    const members = await this.em.find(OrganizationMemberOrmEntity, {
      organizationId,
      status: { $ne: OrganizationMemberStatus.REMOVED },
    });
    const invitations = await this.em.find(OrganizationInvitationOrmEntity, {
      organizationId,
      status: OrganizationInvitationStatus.PENDING,
    });
    return roles.map((role) => ({
      ...this.roleView(role),
      memberCount: members.filter((member) => this.referencesRole(member.roleId, member.role, role)).length,
      invitationCount: invitations.filter((invitation) => this.referencesRole(invitation.roleId, invitation.role, role)).length,
    }));
  }

  async createRole(
    actorId: string,
    organizationId: string,
    name: string,
    permissions: OrganizationPermission[],
  ) {
    await this.requireManager(actorId, organizationId);
    const organization = await this.requireOrganization(organizationId);
    if (organization.type === OrganizationType.PERSONAL) {
      throw new ForbiddenError('Personal Workspace cannot have custom roles');
    }
    const normalizedName = this.normalizeRoleName(name);
    await this.ensureUniqueRoleName(organizationId, normalizedName);
    const role = this.em.create(
      OrganizationRoleOrmEntity,
      createOrganizationRole({ organizationId, name: normalizedName, permissions }),
    );
    this.em.persist(role);
    await this.audit.record({
      organizationId,
      actorId,
      action: 'ORGANIZATION_ROLE_CREATED',
      resourceType: 'ORGANIZATION_ROLE',
      resourceId: role.id,
      after: { name: role.name, permissions: role.permissions },
    });
    await this.em.flush();
    return this.roleView(role);
  }

  async updateRole(
    actorId: string,
    organizationId: string,
    roleId: string,
    input: { name?: string; permissions?: OrganizationPermission[] },
  ) {
    await this.requireManager(actorId, organizationId);
    const role = await this.requireRoleEntity(organizationId, roleId);
    if (role.isOwner || role.legacyRole) {
      throw new ForbiddenError('Built-in organization roles cannot be changed');
    }
    const nextName = input.name === undefined ? role.name : this.normalizeRoleName(input.name);
    if (nextName !== role.name) await this.ensureUniqueRoleName(organizationId, nextName, role.id);
    const before = { name: role.name, permissions: role.permissions };
    role.name = nextName;
    if (input.permissions) role.permissions = input.permissions;
    role.updatedAt = new Date();
    this.em.persist(role);
    await this.audit.record({
      organizationId,
      actorId,
      action: 'ORGANIZATION_ROLE_UPDATED',
      resourceType: 'ORGANIZATION_ROLE',
      resourceId: role.id,
      before,
      after: { name: role.name, permissions: role.permissions },
    });
    await this.em.flush();
    return this.roleView(role);
  }

  async deleteRole(actorId: string, organizationId: string, roleId: string) {
    await this.requireManager(actorId, organizationId);
    const role = await this.requireRoleEntity(organizationId, roleId);
    if (role.isOwner) throw new ForbiddenError('The organization owner role cannot be deleted');
    if (role.legacyRole) throw new ConflictError('Default organization roles cannot be deleted');
    const [memberCount, invitationCount] = await Promise.all([
      this.em.count(OrganizationMemberOrmEntity, { organizationId, roleId: role.id, status: { $ne: OrganizationMemberStatus.REMOVED } }),
      this.em.count(OrganizationInvitationOrmEntity, { organizationId, roleId: role.id, status: OrganizationInvitationStatus.PENDING }),
    ]);
    if (memberCount > 0 || invitationCount > 0) {
      throw new ConflictError('Reassign members and invitations before deleting this role');
    }
    this.em.remove(role);
    await this.audit.record({
      organizationId,
      actorId,
      action: 'ORGANIZATION_ROLE_DELETED',
      resourceType: 'ORGANIZATION_ROLE',
      resourceId: role.id,
      before: { name: role.name, permissions: role.permissions },
    });
    await this.em.flush();
    return { ok: true as const };
  }

  async getMember(userId: string, organizationId: string, targetUserId: string) {
    await this.requireMembership(userId, organizationId);
    const membership = await this.em.findOne(OrganizationMemberOrmEntity, {
      organizationId,
      userId: targetUserId,
      status: { $ne: OrganizationMemberStatus.REMOVED },
    });
    if (!membership) throw new NotFoundError('Organization member was not found');
    const user = await this.em.findOne(UserOrmEntity, { id: targetUserId });
    if (!user) throw new NotFoundError('User was not found');
    const githubConnection = await this.em.findOne(ConnectionOrmEntity, {
      userId: targetUserId,
      provider: 'GITHUB',
    });
    return {
      id: user.id,
      name: user.name ?? user.githubLogin,
      email: githubConnection?.providerEmail ?? user.githubLogin,
      role: await this.resolveMembershipRole(membership),
      isActive: membership.status === OrganizationMemberStatus.ACTIVE && user.isActive && user.accessStatus !== AccessStatus.SUSPENDED,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async updateOrganization(actorId: string, organizationId: string, name: string) {
    const { organization } = await this.requireManager(actorId, organizationId);
    const normalizedName = name.trim();
    if (!normalizedName) throw new InvalidInputError('Organization name is required');
    const before = { name: organization.name };
    organization.name = normalizedName;
    organization.updatedAt = new Date();
    await this.audit.record({
      organizationId,
      actorId,
      action: 'ORGANIZATION_UPDATED',
      resourceType: 'ORGANIZATION',
      resourceId: organization.id,
      before,
      after: { name: organization.name },
    });
    await this.em.flush();
    return organization;
  }

  async updateMemberStatus(actorId: string, organizationId: string, targetUserId: string, active: boolean) {
    await this.requireManager(actorId, organizationId);
    const membership = await this.em.findOne(OrganizationMemberOrmEntity, {
      organizationId,
      userId: targetUserId,
      status: { $ne: OrganizationMemberStatus.REMOVED },
    });
    if (!membership) throw new NotFoundError('Organization member was not found');
    const targetRole = await this.resolveMembershipRole(membership);
    if (targetRole.isOwner) throw new ForbiddenError('The organization owner status cannot be changed');
    const before = { status: membership.status };
    membership.status = active ? OrganizationMemberStatus.ACTIVE : OrganizationMemberStatus.SUSPENDED;
    membership.updatedAt = new Date();
    this.em.persist(membership);
    await this.audit.record({
      organizationId,
      actorId,
      targetUserId,
      action: 'ORGANIZATION_MEMBER_STATUS_CHANGED',
      resourceType: 'ORGANIZATION_MEMBER',
      resourceId: membership.id,
      before,
      after: { status: membership.status },
    });
    await this.em.flush();
    return this.getMember(actorId, organizationId, targetUserId);
  }

  async updateMemberRole(actorId: string, organizationId: string, targetUserId: string, input: RoleInput) {
    await this.requireManager(actorId, organizationId);
    const nextRole = await this.resolveRequestedRole(organizationId, input);
    const target = await this.em.findOne(OrganizationMemberOrmEntity, {
      organizationId,
      userId: targetUserId,
      status: OrganizationMemberStatus.ACTIVE,
    });
    if (!target) throw new NotFoundError('Organization member was not found');
    const currentRole = await this.resolveMembershipRole(target);
    if (currentRole.isOwner) throw new ForbiddenError('The organization owner role cannot be changed');
    if (nextRole.isOwner) throw new ForbiddenError('Ownership transfer is not supported');
    target.roleId = nextRole.id;
    target.role = this.legacyRoleForRole(nextRole);
    target.updatedAt = new Date();
    this.em.persist(target);
    await this.audit.record({
      organizationId,
      actorId,
      targetUserId,
      action: 'ORGANIZATION_MEMBER_ROLE_CHANGED',
      resourceType: 'ORGANIZATION_MEMBER',
      resourceId: target.id,
      before: { role: currentRole.name, roleId: currentRole.id },
      after: { role: nextRole.name, roleId: nextRole.id },
    });
    await this.em.flush();
    return this.getMember(actorId, organizationId, targetUserId);
  }

  async removeMember(actorId: string, organizationId: string, targetUserId: string) {
    await this.requireManager(actorId, organizationId);
    const target = await this.em.findOne(OrganizationMemberOrmEntity, {
      organizationId,
      userId: targetUserId,
      status: OrganizationMemberStatus.ACTIVE,
    });
    if (!target) throw new NotFoundError('Organization member was not found');
    const targetRole = await this.resolveMembershipRole(target);
    if (targetRole.isOwner) throw new ForbiddenError('The organization owner cannot be removed');
    target.status = OrganizationMemberStatus.REMOVED;
    target.updatedAt = new Date();
    this.em.persist(target);
    await this.audit.record({
      organizationId,
      actorId,
      targetUserId,
      action: 'ORGANIZATION_MEMBER_REMOVED',
      resourceType: 'ORGANIZATION_MEMBER',
      resourceId: target.id,
      after: { status: target.status },
    });
    await this.em.flush();
    return target;
  }

  async createInvitation(actorId: string, organizationId: string, email: string, input: RoleInput) {
    await this.requireManager(actorId, organizationId);
    const role = await this.resolveRequestedRole(
      organizationId,
      input,
      OrganizationMemberRole.MEMBER,
    );
    if (
      role.legacyRole !== OrganizationMemberRole.ADMIN &&
      role.legacyRole !== OrganizationMemberRole.MEMBER
    ) {
      throw new InvalidInputError('Invitations can only assign Admin or Member roles');
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) throw new InvalidInputError('Invitation email is required');
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const existingInvitation = await this.em.findOne(OrganizationInvitationOrmEntity, {
      organizationId,
      email: normalizedEmail,
      status: OrganizationInvitationStatus.PENDING,
    });
    const invitation = existingInvitation ?? createOrganizationInvitation({
      organizationId,
      invitedBy: actorId,
      email: normalizedEmail,
      tokenHash: this.hashToken(token),
      role: this.legacyRoleForRole(role),
      roleId: role.id,
      expiresAt,
    });
    if (existingInvitation) {
      invitation.invitedBy = actorId;
      invitation.email = normalizedEmail;
      invitation.tokenHash = this.hashToken(token);
      invitation.role = this.legacyRoleForRole(role);
      invitation.roleId = role.id;
      invitation.status = OrganizationInvitationStatus.PENDING;
      invitation.expiresAt = expiresAt;
      invitation.acceptedBy = null;
      invitation.acceptedAt = null;
      invitation.createdAt = new Date();
    }
    const invitationEntity = existingInvitation ?? this.em.create(OrganizationInvitationOrmEntity, invitation);
    this.em.persist(invitationEntity);
    await this.audit.record({
      organizationId,
      actorId,
      action: existingInvitation
        ? 'ORGANIZATION_INVITATION_RESENT'
        : 'ORGANIZATION_INVITATION_CREATED',
      resourceType: 'ORGANIZATION_INVITATION',
      resourceId: invitation.id,
      after: {
        email: invitation.email,
        role: role.name,
        roleId: role.id,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    });
    await this.em.flush();
    return { invitation, token, role };
  }

  async listInvitations(actorId: string, organizationId: string) {
    await this.requireManager(actorId, organizationId);
    const invitations = await this.em.find(
      OrganizationInvitationOrmEntity,
      {
        organizationId,
        status: OrganizationInvitationStatus.PENDING,
      },
      { orderBy: { createdAt: 'DESC' } },
    );

    return Promise.all(invitations.map(async (invitation) => ({
      id: invitation.id,
      organizationId: invitation.organizationId,
      email: invitation.email,
      role: await this.resolveInvitationRole(invitation),
      status: invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
    })));
  }

  async cancelInvitation(actorId: string, organizationId: string, invitationId: string) {
    await this.requireManager(actorId, organizationId);
    const invitation = await this.em.findOne(OrganizationInvitationOrmEntity, {
      id: invitationId,
      organizationId,
      status: OrganizationInvitationStatus.PENDING,
    });
    if (!invitation) throw new NotFoundError('Pending organization invitation was not found');

    invitation.status = OrganizationInvitationStatus.CANCELLED;
    this.em.persist(invitation);
    await this.audit.record({
      organizationId,
      actorId,
      action: 'ORGANIZATION_INVITATION_CANCELLED',
      resourceType: 'ORGANIZATION_INVITATION',
      resourceId: invitation.id,
      after: { email: invitation.email, status: invitation.status },
    });
    await this.em.flush();
    return { ok: true as const };
  }

  async acceptInvitation(userId: string, token: string) {
    const invitation = await this.em.findOne(OrganizationInvitationOrmEntity, {
      tokenHash: this.hashToken(token),
      status: OrganizationInvitationStatus.PENDING,
    });
    if (!invitation) throw new NotFoundError('Invitation was not found or has already been used');
    if (invitation.expiresAt.getTime() <= Date.now()) {
      invitation.status = OrganizationInvitationStatus.EXPIRED;
      this.em.persist(invitation);
      await this.em.flush();
      throw new ConflictError('Invitation has expired');
    }
    if (!invitation.email) {
      throw new ConflictError('Invitation requires an email address');
    }
    const organization = await this.requireOrganization(invitation.organizationId);
    const connection = await this.em.findOne(ConnectionOrmEntity, { userId, provider: 'GITHUB' });
    if (
      !connection?.providerEmailVerified ||
      connection.providerEmail?.toLowerCase() !== invitation.email.toLowerCase()
    ) {
      throw new ForbiddenError('This invitation requires a matching verified GitHub email address');
    }
    const role = await this.resolveInvitationRole(invitation);
    if (role.isOwner) throw new ConflictError('An invitation cannot assign the owner role');
    const user = await this.em.findOne(UserOrmEntity, { id: userId });
    if (!user) throw new NotFoundError('User was not found');
    if (!user.isActive || user.accessStatus === AccessStatus.REJECTED || user.accessStatus === AccessStatus.SUSPENDED) {
      throw new ForbiddenError('This user cannot accept organization invitations');
    }
    user.accessStatus = AccessStatus.APPROVED;
    this.em.persist(user);
    let membership = await this.em.findOne(OrganizationMemberOrmEntity, {
      organizationId: organization.id,
      userId,
    });
    if (membership?.status === OrganizationMemberStatus.ACTIVE) {
      const currentRole = await this.resolveMembershipRole(membership);
      if (currentRole.isOwner) {
        throw new ForbiddenError('The organization owner cannot accept a replacement invitation');
      }
      throw new ConflictError('The user is already an active member of this organization');
    }
    if (!membership) {
      membership = this.em.create(OrganizationMemberOrmEntity, createOrganizationMember({
        organizationId: organization.id,
        userId,
        role: this.legacyRoleForRole(role),
        roleId: role.id,
      }));
    } else {
      membership.role = this.legacyRoleForRole(role);
      membership.roleId = role.id;
      membership.status = OrganizationMemberStatus.ACTIVE;
      membership.updatedAt = new Date();
    }
    invitation.status = OrganizationInvitationStatus.ACCEPTED;
    invitation.acceptedBy = userId;
    invitation.acceptedAt = new Date();
    this.em.persist(membership);
    this.em.persist(invitation);
    await this.audit.record({
      organizationId: organization.id,
      actorId: userId,
      targetUserId: userId,
      action: 'ORGANIZATION_INVITATION_ACCEPTED',
      resourceType: 'ORGANIZATION_MEMBER',
      resourceId: membership.id,
      after: { role: role.name, roleId: role.id },
    });
    await this.security.record({ organizationId: organization.id, userId, event: 'INVITATION_ACCEPTED' });
    await this.em.flush();
    return organization;
  }

  hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async ensureDefaultRoles(organization: OrganizationOrmEntity) {
    const roles = await this.em.find(OrganizationRoleOrmEntity, { organizationId: organization.id });
    const requiredRoles = [
      {
        legacyRole: OrganizationMemberRole.OWNER,
        name: DEFAULT_ROLE_NAMES.owner,
        permissions: [ORGANIZATION_PERMISSIONS.MANAGE] as OrganizationPermission[],
        isOwner: true,
      },
      ...(organization.type === OrganizationType.SHARED
        ? [
            {
              legacyRole: OrganizationMemberRole.ADMIN,
              name: DEFAULT_ROLE_NAMES.admin,
              permissions: [ORGANIZATION_PERMISSIONS.MANAGE] as OrganizationPermission[],
              isOwner: false,
            },
            {
              legacyRole: OrganizationMemberRole.MEMBER,
              name: DEFAULT_ROLE_NAMES.member,
              permissions: [] as OrganizationPermission[],
              isOwner: false,
            },
          ]
        : []),
    ];
    const ensured = [...roles];
    let changed = false;

    for (const requiredRole of requiredRoles) {
      const role =
        roles.find((candidate) => candidate.legacyRole === requiredRole.legacyRole) ??
        roles.find((candidate) => candidate.isOwner === requiredRole.isOwner && candidate.name.toLowerCase() === requiredRole.name.toLowerCase());
      if (!role) {
        const created = this.em.create(
          OrganizationRoleOrmEntity,
          createOrganizationRole({
            organizationId: organization.id,
            name: requiredRole.name,
            permissions: requiredRole.permissions,
            isOwner: requiredRole.isOwner,
            legacyRole: requiredRole.legacyRole,
          }),
        );
        this.em.persist(created);
        ensured.push(created);
        changed = true;
        continue;
      }

      const permissionsChanged =
        JSON.stringify(role.permissions) !== JSON.stringify(requiredRole.permissions);
      if (
        role.name !== requiredRole.name ||
        role.legacyRole !== requiredRole.legacyRole ||
        role.isOwner !== requiredRole.isOwner ||
        permissionsChanged
      ) {
        role.name = requiredRole.name;
        role.legacyRole = requiredRole.legacyRole;
        role.isOwner = requiredRole.isOwner;
        role.permissions = requiredRole.permissions;
        role.updatedAt = new Date();
        this.em.persist(role);
        changed = true;
      }
    }

    if (changed) await this.em.flush();
    return ensured;
  }

  private createDefaultRoleRecords(organizationId: string, shared: boolean) {
    const owner = createOrganizationRole({
      organizationId,
      name: DEFAULT_ROLE_NAMES.owner,
      permissions: [ORGANIZATION_PERMISSIONS.MANAGE],
      isOwner: true,
      legacyRole: OrganizationMemberRole.OWNER,
    });
    if (!shared) return [owner];
    return [
      owner,
      createOrganizationRole({
        organizationId,
        name: DEFAULT_ROLE_NAMES.admin,
        permissions: [ORGANIZATION_PERMISSIONS.MANAGE],
        legacyRole: OrganizationMemberRole.ADMIN,
      }),
      createOrganizationRole({
        organizationId,
        name: DEFAULT_ROLE_NAMES.member,
        permissions: [],
        legacyRole: OrganizationMemberRole.MEMBER,
      }),
    ];
  }

  private async resolveMembershipRole(membership: OrganizationMemberOrmEntity) {
    const role = membership.roleId
      ? await this.em.findOne(OrganizationRoleOrmEntity, {
          id: membership.roleId,
          organizationId: membership.organizationId,
        })
      : await this.em.findOne(OrganizationRoleOrmEntity, {
          organizationId: membership.organizationId,
          legacyRole: membership.role,
        });
    return this.roleView(role, membership.role);
  }

  private async resolveInvitationRole(invitation: OrganizationInvitationOrmEntity) {
    const role = invitation.roleId
      ? await this.em.findOne(OrganizationRoleOrmEntity, {
          id: invitation.roleId,
          organizationId: invitation.organizationId,
        })
      : await this.em.findOne(OrganizationRoleOrmEntity, {
          organizationId: invitation.organizationId,
          legacyRole: invitation.role,
        });
    if (invitation.roleId && !role) throw new NotFoundError('The invitation role was not found');
    return this.roleView(role, invitation.role);
  }

  private async resolveRequestedRole(
    organizationId: string,
    input: RoleInput,
    fallbackRole?: OrganizationMemberRole,
  ) {
    if (input.roleId) return this.requireRole(organizationId, input.roleId);
    const requestedRole = input.role ?? fallbackRole;
    if (!requestedRole) throw new InvalidInputError('A role is required');
    const organization = await this.requireOrganization(organizationId);
    const roles = await this.ensureDefaultRoles(organization);
    const role = roles.find((candidate) => candidate.legacyRole === requestedRole)
      ?? roles.find((candidate) => {
        if (requestedRole === OrganizationMemberRole.OWNER) return candidate.isOwner;
        if (requestedRole === OrganizationMemberRole.ADMIN) return candidate.name.toLowerCase() === DEFAULT_ROLE_NAMES.admin.toLowerCase();
        return candidate.name.toLowerCase() === DEFAULT_ROLE_NAMES.member.toLowerCase();
      });
    if (!role) throw new NotFoundError('The requested organization role was not found');
    return this.roleView(role);
  }

  private async requireRoleEntity(organizationId: string, roleId: string) {
    const role = await this.em.findOne(OrganizationRoleOrmEntity, { id: roleId, organizationId });
    if (!role) throw new NotFoundError('Organization role was not found');
    return role;
  }

  private async requireRole(organizationId: string, roleId: string) {
    return this.roleView(await this.requireRoleEntity(organizationId, roleId));
  }

  private roleView(role: OrganizationRoleOrmEntity | null | undefined, legacyRole?: OrganizationMemberRole): OrganizationRoleView {
    if (role) {
      return {
        id: role.id,
        name: role.name,
        permissions: role.permissions,
        isOwner: role.isOwner,
        legacyRole: role.legacyRole ?? (role.isOwner ? OrganizationMemberRole.OWNER : null),
      };
    }
    const fallback = legacyRole ?? OrganizationMemberRole.MEMBER;
    return {
      id: null,
      name: fallback === OrganizationMemberRole.OWNER
        ? DEFAULT_ROLE_NAMES.owner
        : fallback === OrganizationMemberRole.ADMIN
          ? DEFAULT_ROLE_NAMES.admin
          : DEFAULT_ROLE_NAMES.member,
      permissions: fallback === OrganizationMemberRole.ADMIN || fallback === OrganizationMemberRole.OWNER
        ? [ORGANIZATION_PERMISSIONS.MANAGE]
        : [],
      isOwner: fallback === OrganizationMemberRole.OWNER,
      legacyRole: fallback,
    };
  }

  private legacyRoleForRole(role: OrganizationRoleView) {
    if (role.isOwner) return OrganizationMemberRole.OWNER;
    return role.permissions.includes(ORGANIZATION_PERMISSIONS.MANAGE)
      ? OrganizationMemberRole.ADMIN
      : OrganizationMemberRole.MEMBER;
  }

  private referencesRole(roleId: string | null, legacyRole: OrganizationMemberRole, role: OrganizationRoleOrmEntity) {
    if (roleId) return roleId === role.id;
    return role.legacyRole === legacyRole || (role.isOwner && legacyRole === OrganizationMemberRole.OWNER);
  }

  private normalizeRoleName(name: string) {
    const normalized = name.trim();
    if (!normalized) throw new InvalidInputError('Role name is required');
    return normalized;
  }

  private async ensureUniqueRoleName(organizationId: string, name: string, excludingId?: string) {
    const roles = await this.em.find(OrganizationRoleOrmEntity, { organizationId });
    if (roles.some((role) => role.id !== excludingId && role.name.toLowerCase() === name.toLowerCase())) {
      throw new ConflictError('An organization role with this name already exists');
    }
  }

  private async uniqueSlug(baseSlug: string) {
    let slug = baseSlug;
    let suffix = 2;
    while (await this.em.findOne(OrganizationOrmEntity, { slug })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    return slug;
  }
}
