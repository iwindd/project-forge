import { z } from 'zod'

const userRoleObjectSchema = z
  .object({
    legacyRole: z.enum(['OWNER', 'ADMIN', 'MEMBER']).nullable(),
    isOwner: z.boolean()
  })
  .passthrough()

export const userRoleSchema = z.union([
  z.enum(['ADMIN', 'USER', 'OWNER', 'MEMBER', 'EDITOR']),
  userRoleObjectSchema
])

export type UserRoleValue = z.infer<typeof userRoleSchema>

export function normalizeUserRole(role: UserRoleValue): 'ADMIN' | 'EDITOR' {
  const isAdmin =
    typeof role === 'string'
      ? role === 'ADMIN' || role === 'OWNER'
      : role.isOwner || role.legacyRole === 'ADMIN'

  return isAdmin ? 'ADMIN' : 'EDITOR'
}

export const userListItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string(),
  role: z.enum(['ADMIN', 'EDITOR']),
  isActive: z.boolean(),
  accessStatus: z.string().optional(),
  githubLogin: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1).optional()
})

export const userListResponseSchema = z.object({
  data: z.array(userListItemSchema),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number()
  })
})

export const userListMetaSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number()
})

export const userDetailResponseSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    name: z.string().nullable(),
    email: z.string().nullable(),
    role: userRoleSchema,
    isActive: z.boolean(),
    accessStatus: z.string().optional(),
    githubLogin: z.string().optional(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1)
  })
})

export type UserDetailResponse = z.infer<typeof userDetailResponseSchema>
