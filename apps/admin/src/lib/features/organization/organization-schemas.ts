import { z } from 'zod';
import type { Organization } from './types';

const postgresUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** PostgreSQL accepts any canonical UUID-shaped value, not only RFC UUID versions. */
export const databaseUuidSchema = z.string().regex(postgresUuidPattern);

export const organizationRoleSchema = z.object({
  id: databaseUuidSchema,
  name: z.string().min(1),
  permissions: z.array(z.string()),
  isOwner: z.boolean(),
  code: z.enum(['OWNER', 'ADMIN', 'MEMBER']).nullable(),
});

export const organizationResourceSchema = z.object({
  id: databaseUuidSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  type: z.enum(['PERSONAL', 'SHARED']),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'SUSPENDED']),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const organizationSchema = organizationResourceSchema.extend({
  role: organizationRoleSchema,
}) satisfies z.ZodType<Organization>;

export const organizationListSchema = z.array(organizationSchema);

export const organizationResponseSchema = z.object({
  organization: organizationResourceSchema,
});

export const acceptInvitationResponseSchema = organizationResponseSchema;

export const organizationRoleSummarySchema = organizationRoleSchema.extend({
  memberCount: z.number().int().nonnegative(),
  invitationCount: z.number().int().nonnegative(),
});

export const organizationMemberSchema = z.object({
  id: databaseUuidSchema,
  membershipId: databaseUuidSchema,
  name: z.string().min(1),
  email: z.string().nullable(),
  role: organizationRoleSchema,
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED', 'REMOVED']),
  isActive: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const organizationMemberUserSchema = z.object({
  id: databaseUuidSchema,
  name: z.string().min(1),
  email: z.string().nullable(),
  role: organizationRoleSchema,
  isActive: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const organizationMemberUserResponseSchema = z.object({
  user: organizationMemberUserSchema,
});

export const organizationMemberRoleResponseSchema = z.object({
  membership: organizationMemberUserSchema,
});

export const organizationInvitationSchema = z.object({
  id: databaseUuidSchema,
  organizationId: databaseUuidSchema,
  email: z.string().email(),
  role: organizationRoleSchema,
  status: z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED']),
  expiresAt: z.string().min(1),
  createdAt: z.string().min(1),
});

export const organizationRoleResponseSchema = z.object({
  role: organizationRoleSchema,
});

export const organizationInvitationResponseSchema = z.object({
  invitation: organizationInvitationSchema,
  token: z.string().min(1),
});

export const okResponseSchema = z.object({
  ok: z.literal(true),
});

export const nullResponseSchema = z.null();

export const organizationRolesMetaSchema = z.object({
  availablePermissions: z.array(z.object({ key: z.enum(['organization.manage', 'project.manage']) })),
});

export const organizationMembersMetaSchema = z.object({
  page: z.number().int().nonnegative(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
