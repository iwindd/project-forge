import { z } from 'zod'

const connectionSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  username: z.string().nullable(),
  email: z.string().nullable(),
  connectedAt: z.string().min(1)
})

export const profileResponseSchema = z.object({
  profile: z.object({
    id: z.string().min(1),
    displayName: z.string().min(1),
    avatarUrl: z.string().nullable(),
    bio: z.string().nullable(),
    timezone: z.string().nullable(),
    platformRole: z.enum(['ADMIN', 'USER']),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1)
  }),
  connections: z.array(connectionSchema)
})

export const profileUpdateResponseSchema = z.object({
  profile: z.object({
    id: z.string().min(1),
    displayName: z.string().min(1).nullable(),
    avatarUrl: z.string().nullable(),
    bio: z.string().nullable(),
    timezone: z.string().nullable(),
    updatedAt: z.string().min(1)
  })
})
