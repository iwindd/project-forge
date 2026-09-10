import { z } from 'zod'
import { databaseUuidSchema } from '../../../../common/http/database-uuid.schema.js'

const userResponseSchema = z.object({
  id: databaseUuidSchema,
  name: z.string().min(1),
  email: z.string(),
  role: z.enum(['ADMIN', 'EDITOR']),
  isActive: z.boolean(),
  accessStatus: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
  githubLogin: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
})

const userPaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative()
})

export const userListResponseSchema = z.object({
  data: z.array(userResponseSchema),
  meta: userPaginationMetaSchema
})

export const userResponseEnvelopeSchema = z.object({
  data: z.object({ user: userResponseSchema })
})

export const userMutationResponseSchema = z.object({
  data: z.null()
})
