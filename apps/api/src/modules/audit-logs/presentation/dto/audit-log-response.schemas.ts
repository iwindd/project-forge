import { z } from 'zod'
import { databaseUuidSchema } from '../../../../common/http/database-uuid.schema.js'

const auditLogUserSummarySchema = z.object({
  id: databaseUuidSchema,
  name: z.string(),
  email: z.string()
})

const auditLogPaginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative()
})

export const auditLogListItemResponseSchema = z.object({
  id: databaseUuidSchema,
  createdAt: z.string().min(1),
  action: z.string().min(1),
  resourceType: z.string().min(1),
  resourceId: z.string().nullable(),
  actorRole: z.enum(['ADMIN', 'USER']).nullable(),
  actor: auditLogUserSummarySchema.nullable(),
  target: auditLogUserSummarySchema.nullable(),
  reason: z.string().nullable(),
  hasBefore: z.boolean(),
  hasAfter: z.boolean()
})

export const auditLogListResponseSchema = z.object({
  data: z.array(auditLogListItemResponseSchema),
  meta: auditLogPaginationMetaSchema
})

const securityLogResponseSchema = z.object({
  id: databaseUuidSchema,
  organizationId: databaseUuidSchema.nullable(),
  userId: databaseUuidSchema.nullable(),
  event: z.string().min(1),
  provider: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().min(1)
})

export const securityLogListResponseSchema = z.object({
  data: z.array(securityLogResponseSchema),
  meta: auditLogPaginationMetaSchema
})

const auditLogExportDataSchema = z.object({
  id: databaseUuidSchema,
  organizationId: databaseUuidSchema.nullable(),
  actorId: databaseUuidSchema.nullable(),
  targetUserId: databaseUuidSchema.nullable(),
  action: z.string().min(1),
  resourceType: z.string().min(1),
  resourceId: z.string().nullable(),
  beforeJson: z.record(z.string(), z.unknown()).nullable(),
  afterJson: z.record(z.string(), z.unknown()).nullable(),
  reason: z.string().nullable(),
  requestId: z.string().nullable(),
  createdAt: z.string().min(1)
})

export const auditLogExportResponseSchema = z.object({
  data: auditLogExportDataSchema
})
