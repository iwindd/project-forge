import { EntityManager } from '@mikro-orm/core';
import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOGGER } from '../../../common/audit/audit.port.js';
import type { AuditLogPort } from '../../../common/audit/audit.port.js';
import { SECURITY_LOGGER } from '../../../common/security/security-log.port.js';
import type { SecurityLogPort } from '../../../common/security/security-log.port.js';
import { createHash, randomBytes } from 'node:crypto';
import {
  ConflictError,
  ForbiddenError,
  InvalidInputError,
  NotFoundError,
} from '../../../common/errors/application-error.js';
import { UserOrmEntity } from '../../users/infrastructure/persistence/user.orm-entity.js';
import { ProfileOrmEntity } from '../../users/infrastructure/persistence/profile.orm-entity.js';
import { AccessStatus } from '../../users/domain/user.js';
import { ConnectionOrmEntity } from '../../auth/infrastructure/persistence/connection.orm-entity.js';
import {
  createOrganization,
  createOrganizationInvitation,
  createOrganizationMember,
  OrganizationInvitationStatus,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  OrganizationStatus,
  OrganizationType,
  slugifyOrganizationName,
} from '../domain/organization.js';
import { OrganizationInvitationOrmEntity } from '../infrastructure/persistence/organization-invitation.orm-entity.js';
import { OrganizationMemberOrmEntity } from '../infrastructure/persistence/organization-member.orm-entity.js';
import { OrganizationOrmEntity } from '../infrastructure/persistence/organization.orm-entity.js';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly em: EntityManager,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogPort,
    @Inject(SECURITY_LOGGER) private readonly security: SecurityLogPort,
  ) {}

  async ensurePersonalWorkspace(ownerId: string, displayName: string | null) {
    const existing = await this.em.findOne(OrganizationOrmEntity, {
      ownerId,
      type: OrganizationType.PERSONAL,
      status: OrganizationStatus.ACTIVE,
    });
    if (existing) return existing;

    const baseName = `${displayName?.trim() || 'Personal'} Workspace`;
    const organization = createOrganization({
      ownerId,
      name: baseName,
      slug: `personal-${ownerId}`,
      type: OrganizationType.PERSONAL,
    });
    const member = createOrganizationMember({
      organizationId: organization.id,
      userId: ownerId,
      role: OrganizationMemberRole.OWNER,
    });
    this.em.persist(this.em.create(OrganizationOrmEntity, organization));
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
    const organizationMap = new Map(organizations.map((organization) => [organization.id, organization]));
    return memberships
      .map((membership) => {
        const organization = organizationMap.get(membership.organizationId);
        return organization ? { organization, membership } : null;
      })
      .filter((value): value is { organization: OrganizationOrmEntity; membership: OrganizationMemberOrmEntity } => value !== null);
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
    const member = createOrganizationMember({
      organizationId: organization.id,
      userId: ownerId,
      role: OrganizationMemberRole.OWNER,
    });
    this.em.persist(this.em.create(OrganizationOrmEntity, organization));
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
    return { organization, membership };
  }

  async requireManager(userId: string, organizationId: string) {
    const result = await this.requireMembership(userId, organizationId);
    if (![OrganizationMemberRole.OWNER, OrganizationMemberRole.ADMIN].includes(result.membership.role)) {
      throw new ForbiddenError('Organization administrator access is required');
    }
    if (result.organization.type === OrganizationType.PERSONAL) {
      throw new ForbiddenError('Personal Workspace cannot be managed as a shared organization');
    }
    return result;
  }

  async listMembers(userId: string, organizationId: string) {
    await this.requireMembership(userId, organizationId);
    const members = await this.em.find(OrganizationMemberOrmEntity, {
      organizationId,
      status: { $ne: OrganizationMemberStatus.REMOVED },
    }, { orderBy: { joinedAt: 'ASC' } });
    const userIds = members.map((member) => member.userId);
    const users = userIds.length
      ? await this.em.find(UserOrmEntity, { id: { $in: userIds } })
      : [];
    const githubConnections = userIds.length
      ? await this.em.find(ConnectionOrmEntity, { userId: { $in: userIds }, provider: 'GITHUB' })
      : [];
    const userMap = new Map(users.map((user) => [user.id, user]));
    const emailMap = new Map(githubConnections.map((connection) => [connection.userId, connection.providerEmail]));
    return members.map((member) => {
      const user = userMap.get(member.userId);
      return {
        id: member.userId,
        membershipId: member.id,
        name: user?.name ?? user?.githubLogin ?? 'Unknown user',
        email: emailMap.get(member.userId) ?? user?.githubLogin ?? null,
        role: member.role,
        status: member.status,
        isActive: member.status === OrganizationMemberStatus.ACTIVE && Boolean(user?.isActive && user.accessStatus !== AccessStatus.SUSPENDED),
        createdAt: user?.createdAt.toISOString() ?? member.joinedAt.toISOString(),
        updatedAt: user?.updatedAt.toISOString() ?? member.updatedAt.toISOString(),
      };
    });
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
      role: membership.role,
      isActive: membership.status === OrganizationMemberStatus.ACTIVE && user.isActive && user.accessStatus !== AccessStatus.SUSPENDED,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async updateMemberName(actorId: string, organizationId: string, targetUserId: string, name: string) {
    await this.requireManager(actorId, organizationId);
    const user = await this.em.findOne(UserOrmEntity, { id: targetUserId });
    if (!user) throw new NotFoundError('User was not found');
    const normalizedName = name.trim();
    if (!normalizedName) throw new InvalidInputError('User name is required');
    const before = { name: user.name };
    user.name = normalizedName;
    user.updatedAt = new Date();
    const profile = await this.em.findOne(ProfileOrmEntity, { userId: targetUserId });
    if (profile) {
      profile.displayName = normalizedName;
      profile.updatedAt = new Date();
      this.em.persist(profile);
    }
    this.em.persist(user);
    await this.audit.record({
      organizationId,
      actorId,
      targetUserId,
      action: 'ORGANIZATION_MEMBER_NAME_CHANGED',
      resourceType: 'PROFILE',
      resourceId: targetUserId,
      before,
      after: { name: normalizedName },
    });
    await this.em.flush();
    return this.getMember(actorId, organizationId, targetUserId);
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
    if (membership.role === OrganizationMemberRole.OWNER && !active) {
      const owners = await this.em.count(OrganizationMemberOrmEntity, {
        organizationId,
        role: OrganizationMemberRole.OWNER,
        status: OrganizationMemberStatus.ACTIVE,
      });
      if (owners <= 1) throw new ForbiddenError('At least one active organization owner must remain');
    }
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

  async updateMemberRole(actorId: string, organizationId: string, targetUserId: string, role: OrganizationMemberRole) {
    const { membership: actorMembership } = await this.requireManager(actorId, organizationId);
    if (role === OrganizationMemberRole.OWNER && actorMembership.role !== OrganizationMemberRole.OWNER) {
      throw new ForbiddenError('Only the organization owner can transfer ownership');
    }
    const target = await this.em.findOne(OrganizationMemberOrmEntity, {
      organizationId,
      userId: targetUserId,
      status: OrganizationMemberStatus.ACTIVE,
    });
    if (!target) throw new NotFoundError('Organization member was not found');
    if (target.role === OrganizationMemberRole.OWNER && role !== OrganizationMemberRole.OWNER) {
      const owners = await this.em.count(OrganizationMemberOrmEntity, {
        organizationId,
        role: OrganizationMemberRole.OWNER,
        status: OrganizationMemberStatus.ACTIVE,
      });
      if (owners <= 1) throw new ForbiddenError('At least one organization owner must remain');
    }
    target.role = role;
    target.updatedAt = new Date();
    this.em.persist(target);
    await this.audit.record({
      organizationId,
      actorId,
      targetUserId: targetUserId,
      action: 'ORGANIZATION_MEMBER_ROLE_CHANGED',
      resourceType: 'ORGANIZATION_MEMBER',
      resourceId: target.id,
      after: { role },
    });
    await this.em.flush();
    return target;
  }

  async removeMember(actorId: string, organizationId: string, targetUserId: string) {
    const { membership: actorMembership } = await this.requireManager(actorId, organizationId);
    const target = await this.em.findOne(OrganizationMemberOrmEntity, {
      organizationId,
      userId: targetUserId,
      status: OrganizationMemberStatus.ACTIVE,
    });
    if (!target) throw new NotFoundError('Organization member was not found');
    if (target.role === OrganizationMemberRole.OWNER) {
      if (actorMembership.role !== OrganizationMemberRole.OWNER) {
        throw new ForbiddenError('Only the organization owner can remove an owner');
      }
      const owners = await this.em.count(OrganizationMemberOrmEntity, {
        organizationId,
        role: OrganizationMemberRole.OWNER,
        status: OrganizationMemberStatus.ACTIVE,
      });
      if (owners <= 1) throw new ForbiddenError('Transfer ownership before removing the last owner');
    }
    target.status = OrganizationMemberStatus.REMOVED;
    target.updatedAt = new Date();
    this.em.persist(target);
    await this.audit.record({
      organizationId,
      actorId,
      targetUserId: targetUserId,
      action: 'ORGANIZATION_MEMBER_REMOVED',
      resourceType: 'ORGANIZATION_MEMBER',
      resourceId: target.id,
      after: { status: target.status },
    });
    await this.em.flush();
    return target;
  }

  async createInvitation(actorId: string, organizationId: string, email: string | null, role: OrganizationMemberRole) {
    await this.requireManager(actorId, organizationId);
    if (role === OrganizationMemberRole.OWNER) throw new InvalidInputError('Invitations cannot assign owner role');
    const token = randomBytes(32).toString('base64url');
    const invitation = createOrganizationInvitation({
      organizationId,
      invitedBy: actorId,
      email: email?.trim().toLowerCase() || null,
      tokenHash: this.hashToken(token),
      role,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    this.em.persist(this.em.create(OrganizationInvitationOrmEntity, invitation));
    await this.audit.record({
      organizationId,
      actorId,
      action: 'ORGANIZATION_INVITATION_CREATED',
      resourceType: 'ORGANIZATION_INVITATION',
      resourceId: invitation.id,
      after: { email: invitation.email, role: invitation.role },
    });
    await this.em.flush();
    return { invitation, token };
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

    return invitations.map((invitation) => ({
      id: invitation.id,
      organizationId: invitation.organizationId,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
    }));
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
      throw new ConflictError('Invitation has expired');
    }
    const organization = await this.requireOrganization(invitation.organizationId);
    if (invitation.email) {
      const connection = await this.em.findOne(ConnectionOrmEntity, { userId, provider: 'GITHUB' });
      if (connection?.providerEmail?.toLowerCase() !== invitation.email.toLowerCase()) {
        throw new ForbiddenError('This invitation is assigned to a different email address');
      }
    }
    let membership = await this.em.findOne(OrganizationMemberOrmEntity, {
      organizationId: organization.id,
      userId,
    });
    if (!membership) {
      membership = this.em.create(OrganizationMemberOrmEntity, createOrganizationMember({
        organizationId: organization.id,
        userId,
        role: invitation.role,
      }));
    } else {
      membership.role = invitation.role;
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
      after: { role: membership.role },
    });
    await this.security.record({ organizationId: organization.id, userId, event: 'INVITATION_ACCEPTED' });
    await this.em.flush();
    return organization;
  }

  hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
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
