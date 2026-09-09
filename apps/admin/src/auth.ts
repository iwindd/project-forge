import { cookies } from 'next/headers'

type ApiPrincipal = {
  id: string
  githubLogin: string
  name: string | null
  role: 'ADMIN' | 'USER'
  isActive: boolean
  accessStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
  createdAt: string
  updatedAt: string
  activeOrganizationId: string | null
}

type ApiSessionResponse = {
  user: ApiPrincipal
  profile?: { displayName?: string | null; avatarUrl?: string | null } | null
  organizations?: Array<{
    id: string
    name: string
    slug: string
    type: 'PERSONAL' | 'SHARED'
    role: {
      id: string | null
      name: string
      permissions: string[]
      isOwner: boolean
      legacyRole: 'OWNER' | 'ADMIN' | 'MEMBER' | null
    }
  }>
}

const apiOrigin =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:5050'

export async function auth() {
  const cookieStore = await cookies()
  if (!cookieStore.has('pf_session')) return null

  let response: Response
  try {
    response = await fetch(`${apiOrigin}/api/v1/auth/me`, {
      headers: { cookie: cookieStore.toString() },
      cache: 'no-store'
    })
  } catch {
    return null
  }

  if (!response.ok) return null

  const data = (await response.json()) as ApiSessionResponse
  const { user } = data
  if (!user.isActive || user.accessStatus !== 'APPROVED') return null

  const activeOrganization =
    (data.organizations ?? []).find(
      organization => organization.id === user.activeOrganizationId
    ) ?? data.organizations?.[0]

  return {
    user: {
      id: user.id,
      name: data.profile?.displayName ?? user.name ?? user.githubLogin,
      email: null,
      role: user.role === 'ADMIN' ? 'ADMIN' : 'EDITOR',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      activeOrganizationId: user.activeOrganizationId,
      organizationRole: activeOrganization?.role ?? null,
      organizationPermissions: activeOrganization?.role.permissions ?? []
    },
    organizations: data.organizations ?? []
  } as const
}
