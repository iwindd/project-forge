import { z } from 'zod'
import { databaseUuidSchema } from '../../../../common/http/database-uuid.schema.js'

export const auditLogQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  actions: z.string().trim().max(2000).optional(),
  resourceTypes: z.string().trim().max(1000).optional(),
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
  organizationId: databaseUuidSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
})

export const auditLogUserParamSchema = z.object({
  userId: databaseUuidSchema,
})

export const auditLogOrganizationParamSchema = z.object({
  organizationId: databaseUuidSchema,
})

export const auditLogOrganizationUserParamSchema =
  auditLogOrganizationParamSchema.extend({
    userId: databaseUuidSchema,
  })

export const auditLogIdParamSchema = z.object({
  id: databaseUuidSchema,
})

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>
