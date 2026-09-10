import { cookies } from 'next/headers'
import { z } from 'zod'
import { ApiServerError, apiServerFetch } from '@/lib/api-server'
import type { AdminSession } from '@/session'

const authMeSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    githubUserId: z.string().min(1),
    githubLogin: z.string().min(1),
    name: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    role: z.enum(['ADMIN', 'USER']),
    accessStatus: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
    isActive: z.boolean(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1)
  }),
  profile: z
    .object({
      id: z.string().min(1),
      displayName: z.string().nullable(),
      avatarUrl: z.string().nullable(),
      bio: z.string().nullable(),
      timezone: z.string().nullable(),
      updatedAt: z.string().min(1)
    })
    .nullable()
}).strict()

const apiOrigin =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:5050'

export async function auth(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  if (!cookieStore.has('pf_session')) return null

  try {
    const data = await apiServerFetch('auth/me', authMeSchema, {
      headers: { cookie: cookieStore.toString() },
      cache: 'no-store'
    })

    const { user } = data
    if (
      !user.isActive ||
      user.accessStatus === 'REJECTED' ||
      user.accessStatus === 'SUSPENDED'
    ) {
      return null
    }

    return {
      user: {
        id: user.id,
        name: data.profile?.displayName ?? user.name ?? user.githubLogin,
        email: null,
        role: user.role === 'ADMIN' ? 'ADMIN' : 'EDITOR',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }
  } catch (error) {
    if (error instanceof ApiServerError && error.status === 401) {
      return null
    }

    throw error
  }
}

export { apiOrigin }
