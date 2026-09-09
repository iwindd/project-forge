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
