import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiServerFetch: vi.fn(),
  cookies: vi.fn()
}))

vi.mock('next/headers', () => ({ cookies: mocks.cookies }))
vi.mock('@/lib/api-server', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/api-server')>()
  return { ...actual, apiServerFetch: mocks.apiServerFetch }
})

import { auth } from './auth'
import { ApiServerError } from '@/lib/api-server'

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

  it('propagates organization context contract violations', async () => {
    mocks.apiServerFetch.mockImplementation(
      async (_path: string, schema: { parse: (value: unknown) => unknown }) =>
        schema.parse({ ...authResponse, organizations: [] })
    )

    await expect(auth()).rejects.toThrow()
  })

  it('maps an unauthenticated API response to an empty session', async () => {
    const error = new ApiServerError(
      401,
      'UNAUTHENTICATED',
      'Please sign in with GitHub',
      {},
      'request-401'
    )
    mocks.apiServerFetch.mockRejectedValue(error)

    await expect(auth()).resolves.toBeNull()
  })

  it('propagates server failures instead of turning them into login redirects', async () => {
    const error = new ApiServerError(
      500,
      'INTERNAL_SERVER_ERROR',
      'Internal server error',
      {},
      'request-500'
    )
    mocks.apiServerFetch.mockRejectedValue(error)

    await expect(auth()).rejects.toBe(error)
  })

  it('propagates invalid API contracts instead of turning them into login redirects', async () => {
    const error = new ApiServerError(
      200,
      'INVALID_API_RESPONSE',
      'The API returned an invalid response contract',
      [],
      'request-contract'
    )
    mocks.apiServerFetch.mockRejectedValue(error)

    await expect(auth()).rejects.toBe(error)
  })
})
