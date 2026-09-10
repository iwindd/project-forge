import { z } from 'zod'

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
    role: z.union([
      z.enum(['ADMIN', 'USER', 'OWNER', 'MEMBER', 'EDITOR']),
      z.object({
        legacyRole: z.enum(['OWNER', 'ADMIN', 'MEMBER']).nullable(),
        isOwner: z.boolean()
      })
    ]),
    isActive: z.boolean(),
    accessStatus: z.string().optional(),
    githubLogin: z.string().optional(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1)
  })
})

export type UserDetailResponse = z.infer<typeof userDetailResponseSchema>
