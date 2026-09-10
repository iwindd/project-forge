import { z } from 'zod';
import { databaseUuidSchema } from '../../../../common/http/database-uuid.schema.js';
import { ORGANIZATION_PERMISSIONS } from '../../domain/organization.js';

const organizationDateSchema = z.string().min(1);

export const organizationRoleSchema = z.object({
  id: databaseUuidSchema.nullable(),
  name: z.string().min(1),
  permissions: z.array(z.string()),
  isOwner: z.boolean(),
  legacyRole: z.enum(['OWNER', 'ADMIN', 'MEMBER']).nullable(),
});

export const organizationResourceSchema = z.object({
  id: databaseUuidSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  type: z.enum(['PERSONAL', 'SHARED']),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'SUSPENDED']),
  createdAt: organizationDateSchema,
  updatedAt: organizationDateSchema,
});

export const organizationResponseSchema = z.object({
  organization: organizationResourceSchema,
});

export const organizationRoleResponseSchema = z.object({
  role: organizationRoleSchema,
});

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
  createdAt: organizationDateSchema,
  updatedAt: organizationDateSchema,
});

export const organizationMemberUserSchema = z.object({
  id: databaseUuidSchema,
  name: z.string().min(1),
  email: z.string().nullable(),
  role: organizationRoleSchema,
  isActive: z.boolean(),
  createdAt: organizationDateSchema,
  updatedAt: organizationDateSchema,
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
  expiresAt: organizationDateSchema,
  createdAt: organizationDateSchema,
});

export const organizationInvitationResponseSchema = z.object({
  invitation: organizationInvitationSchema,
  token: z.string().min(1),
});

export const okResponseSchema = z.object({
  ok: z.literal(true),
});

export const organizationRoleListSchema = z.array(organizationRoleSummarySchema);
export const organizationMemberListSchema = z.array(organizationMemberSchema);
export const organizationInvitationListSchema = z.array(organizationInvitationSchema);

export const organizationListSchema = z.array(
  organizationResourceSchema.extend({
    role: organizationRoleSchema,
  }),
);

export const organizationRolesResponseSchema = z.object({
  data: organizationRoleListSchema,
  meta: z.object({
    availablePermissions: z.array(
      z.object({
        key: z.enum([
          ORGANIZATION_PERMISSIONS.MANAGE,
          ORGANIZATION_PERMISSIONS.MANAGE_PROJECT,
        ]),
      }),
    ),
  }),
});

export const organizationMembersResponseSchema = z.object({
  data: organizationMemberListSchema,
  meta: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});
