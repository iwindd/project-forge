import { randomUUID } from 'node:crypto';

export enum OrganizationType {
  PERSONAL = 'PERSONAL',
  SHARED = 'SHARED',
}

export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  SUSPENDED = 'SUSPENDED',
}

export enum OrganizationMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export const ORGANIZATION_PERMISSIONS = {
  MANAGE: 'organization.manage',
} as const;

export type OrganizationPermission =
  (typeof ORGANIZATION_PERMISSIONS)[keyof typeof ORGANIZATION_PERMISSIONS];

export enum OrganizationMemberStatus {
  ACTIVE = 'ACTIVE',
  INVITED = 'INVITED',
  SUSPENDED = 'SUSPENDED',
  REMOVED = 'REMOVED',
}

export enum OrganizationInvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export type OrganizationRecord = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  type: OrganizationType;
  status: OrganizationStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type OrganizationRoleRecord = {
  id: string;
  organizationId: string;
  name: string;
  permissions: OrganizationPermission[];
  isOwner: boolean;
  legacyRole: OrganizationMemberRole | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrganizationMemberRecord = {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
  roleId: string | null;
  status: OrganizationMemberStatus;
  joinedAt: Date;
  updatedAt: Date;
};

export type OrganizationInvitationRecord = {
  id: string;
  organizationId: string;
  invitedBy: string;
  email: string;
  tokenHash: string;
  role: OrganizationMemberRole;
  roleId: string | null;
  status: OrganizationInvitationStatus;
  expiresAt: Date;
  acceptedBy: string | null;
  acceptedAt: Date | null;
  createdAt: Date;
};

export function createOrganization(input: {
  ownerId: string;
  name: string;
  slug: string;
  type: OrganizationType;
}): OrganizationRecord {
  const now = new Date();
  return {
    id: randomUUID(),
    ownerId: input.ownerId,
    name: input.name,
    slug: input.slug,
    type: input.type,
    status: OrganizationStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
  };
}

export function createOrganizationRole(input: {
  organizationId: string;
  name: string;
  permissions?: OrganizationPermission[];
  isOwner?: boolean;
  legacyRole?: OrganizationMemberRole | null;
}): OrganizationRoleRecord {
  const now = new Date();
  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    name: input.name.trim(),
    permissions: input.permissions ?? [],
    isOwner: input.isOwner ?? false,
    legacyRole: input.legacyRole ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function createOrganizationMember(input: {
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
  roleId?: string | null;
  status?: OrganizationMemberStatus;
}): OrganizationMemberRecord {
  const now = new Date();
  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    userId: input.userId,
    role: input.role,
    roleId: input.roleId ?? null,
    status: input.status ?? OrganizationMemberStatus.ACTIVE,
    joinedAt: now,
    updatedAt: now,
  };
}

export function createOrganizationInvitation(input: {
  organizationId: string;
  invitedBy: string;
  email: string;
  tokenHash: string;
  role: OrganizationMemberRole;
  roleId?: string | null;
  expiresAt: Date;
}): OrganizationInvitationRecord {
  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    invitedBy: input.invitedBy,
    email: input.email,
    tokenHash: input.tokenHash,
    role: input.role,
    roleId: input.roleId ?? null,
    status: OrganizationInvitationStatus.PENDING,
    expiresAt: input.expiresAt,
    acceptedBy: null,
    acceptedAt: null,
    createdAt: new Date(),
  };
}

export function slugifyOrganizationName(name: string): string {
  const value = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return value || `organization-${randomUUID().slice(0, 8)}`;
}
