import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiServerFetch: vi.fn(),
  cookies: vi.fn()
}))

vi.mock('next/headers', () => ({ cookies: mocks.cookies }))
vi.mock('@/lib/api-server', () => ({
  apiServerFetch: mocks.apiServerFetch
}))

import { auth } from './auth'

const authResponse = {
  user: {
    id: 'user-id',
    githubUserId: 'github-user',
    githubLogin: 'github-login',
    name: 'User',
    avatarUrl: null,
    role: 'USER',
    accessStatus: 'APPROVED',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  profile: null
}

describe('auth session contract', () => {
  beforeEach(() => {
    mocks.cookies.mockResolvedValue({
      has: () => true,
      toString: () => 'pf_session=session-token'
    })
    mocks.apiServerFetch.mockImplementation(
      async (_path: string, schema: { parse: (value: unknown) => unknown }) =>
        schema.parse(authResponse)
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('maps identity and profile without an active organization', async () => {
    await expect(auth()).resolves.toMatchObject({
      user: {
        id: 'user-id',
        role: 'EDITOR'
      }
    })
  })

  it('rejects organization context in auth/me responses', async () => {
    mocks.apiServerFetch.mockImplementation(
      async (_path: string, schema: { parse: (value: unknown) => unknown }) =>
        schema.parse({ ...authResponse, organizations: [] })
    )

    await expect(auth()).resolves.toBeNull()
  })
})
