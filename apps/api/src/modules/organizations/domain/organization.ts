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
  MANAGE_PROJECT: 'project.manage',
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
  code: OrganizationMemberRole | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrganizationMemberRecord = {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
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
  roleId: string;
  status: OrganizationInvitationStatus;
  expiresAt: Date;
  acceptedBy: string | null;
  acceptedAt: Date | null;
  createdAt: Date;
};

export function createOrganization(input: {
  name: string;
  slug: string;
  type: OrganizationType;
}): OrganizationRecord {
  const now = new Date();
  return {
    id: randomUUID(),
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
  code?: OrganizationMemberRole | null;
}): OrganizationRoleRecord {
  const now = new Date();
  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    name: input.name.trim(),
    permissions: input.permissions ?? [],
    isOwner: input.isOwner ?? false,
    code: input.code ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function createOrganizationMember(input: {
  organizationId: string;
  userId: string;
  roleId: string;
  status?: OrganizationMemberStatus;
}): OrganizationMemberRecord {
  const now = new Date();
  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    userId: input.userId,
    roleId: input.roleId,
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
  roleId: string;
  expiresAt: Date;
}): OrganizationInvitationRecord {
  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    invitedBy: input.invitedBy,
    email: input.email,
    tokenHash: input.tokenHash,
    roleId: input.roleId,
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
