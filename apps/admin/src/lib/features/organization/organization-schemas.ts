import { z } from 'zod'
import type { Organization } from './types'

export const organizationRoleSchema = z.object({
  id: z.string().nullable(),
  name: z.string().min(1),
  permissions: z.array(z.string()),
  isOwner: z.boolean(),
  legacyRole: z.enum(['OWNER', 'ADMIN', 'MEMBER']).nullable()
})

export const organizationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  type: z.enum(['PERSONAL', 'SHARED']),
  role: organizationRoleSchema,
  status: z.enum(['ACTIVE', 'ARCHIVED', 'SUSPENDED']),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
}) satisfies z.ZodType<Organization>

export const organizationListSchema = z.array(organizationSchema)

export const organizationRoleSummarySchema = organizationRoleSchema.extend({
  memberCount: z.number().optional(),
  invitationCount: z.number().optional()
})

export const organizationMemberSchema = z.object({
  id: z.string().min(1),
  membershipId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().nullable(),
  role: organizationRoleSchema,
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED', 'REMOVED']),
  isActive: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
})

export const organizationInvitationSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  email: z.string().nullable(),
  role: organizationRoleSchema,
  status: z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED']),
  expiresAt: z.string().min(1),
  createdAt: z.string().min(1)
})

export const organizationRolesMetaSchema = z.object({
  availablePermissions: z.array(
    z.object({ key: z.literal('organization.manage') })
  )
})

export const organizationMembersMetaSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number()
})
