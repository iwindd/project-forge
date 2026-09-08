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
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
).replace(/\/$/, '')

export function githubLoginUrl() {
  return `${API_URL}/auth/github/start`
}
