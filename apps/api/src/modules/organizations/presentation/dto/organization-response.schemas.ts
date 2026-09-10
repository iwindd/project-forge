import { z } from 'zod';
import { databaseUuidSchema } from '../../../../common/http/database-uuid.schema.js';

const organizationRoleSchema = z.object({
  id: databaseUuidSchema.nullable(),
  name: z.string().min(1),
  permissions: z.array(z.string()),
  isOwner: z.boolean(),
  legacyRole: z.enum(['OWNER', 'ADMIN', 'MEMBER']).nullable(),
});

export const organizationRoleSummarySchema = organizationRoleSchema.extend({
  memberCount: z.number(),
  invitationCount: z.number(),
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

export const organizationInvitationSchema = z.object({
  id: databaseUuidSchema,
  organizationId: databaseUuidSchema,
  email: z.string().nullable(),
  role: organizationRoleSchema,
  status: z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED']),
  expiresAt: z.string().min(1),
  createdAt: z.string().min(1),
});

export const organizationRoleListSchema = z.array(organizationRoleSummarySchema);
export const organizationMemberListSchema = z.array(organizationMemberSchema);
export const organizationInvitationListSchema = z.array(organizationInvitationSchema);

export const organizationListSchema = z.array(
  z.object({
    id: databaseUuidSchema,
    name: z.string().min(1),
    slug: z.string().min(1),
    type: z.enum(['PERSONAL', 'SHARED']),
    role: organizationRoleSchema,
    status: z.enum(['ACTIVE', 'ARCHIVED', 'SUSPENDED']),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  }),
);
