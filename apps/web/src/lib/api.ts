export type User = {
  id: string
  githubUserId: string
  githubLogin: string
  name: string | null
  avatarUrl: string | null
  role: 'USER' | 'ADMIN'
  accessStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export type Project = {
  id: string
  ownerId: string
  name: string
  githubUrl: string
  githubOwner: string
  githubRepo: string
  sourceBranch: string
  targetBranch: string
  nodeVersion: string | null
  environmentMetadata: Record<string, unknown> | null
  status: 'ACTIVE' | 'ARCHIVED'
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export type AccessRequest = {
  id: string
  userId: string
  reason: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  reviewedBy?: string | null
  reviewedAt?: string | null
  reviewNote?: string | null
  createdAt: string
  updatedAt?: string
  user?: User | null
}

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3007/api/v1'
).replace(/\/$/, '')

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    cache: 'no-store'
  })
  if (!response.ok) {
    let payload: { code?: string; message?: string } = {}
    try {
      payload = await response.json()
    } catch {
      /* keep the HTTP fallback */
    }
    throw new ApiError(
      response.status,
      payload.code || 'REQUEST_FAILED',
      payload.message || `Request failed (${response.status})`
    )
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function githubLoginUrl() {
  return `${API_URL}/auth/github/start`
}

export async function getMe() {
  return apiFetch<{ user: User }>('/auth/me')
}

export async function getProjects() {
  return apiFetch<{ projects: Project[] }>('/projects')
}

export async function createProject(input: Record<string, unknown>) {
  return apiFetch<{ project: Project }>('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Idempotency-Key': crypto.randomUUID() }
  })
}

export async function getProject(id: string) {
  return apiFetch<{ project: Project }>(`/projects/${id}`)
}

export async function updateProject(
  id: string,
  input: Record<string, unknown>
) {
  return apiFetch<{ project: Project }>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  })
}

export async function archiveProject(id: string) {
  return apiFetch<{ project: Project }>(`/projects/${id}/archive`, {
    method: 'POST'
  })
}

export async function getUsers(search = '', status = '') {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status) params.set('status', status)
  return apiFetch<{ data: User[]; total: number; page: number; limit: number }>(
    `/admin/users?${params.toString()}`
  )
}

export async function updateUserStatus(
  id: string,
  status: User['accessStatus'],
  reason = ''
) {
  return apiFetch<{ user: User }>(`/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason })
  })
}

export async function updateUserRole(
  id: string,
  role: User['role'],
  reason = ''
) {
  return apiFetch<{ user: User }>(`/admin/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role, reason })
  })
}

export async function revokeUserSessions(id: string) {
  return apiFetch<{ ok: boolean }>(`/admin/users/${id}/revoke-sessions`, {
    method: 'POST'
  })
}

export async function getAccessRequests() {
  return apiFetch<{ requests: AccessRequest[] }>('/access-requests')
}

export async function decideAccess(
  id: string,
  decision: 'approve' | 'reject',
  note = ''
) {
  return apiFetch(`/access-requests/${id}/${decision}`, {
    method: 'POST',
    body: JSON.stringify({ note })
  })
}

export async function requestAccess(reason: string) {
  return apiFetch<{ request: AccessRequest }>('/access-requests', {
    method: 'POST',
    body: JSON.stringify({ reason })
  })
}
