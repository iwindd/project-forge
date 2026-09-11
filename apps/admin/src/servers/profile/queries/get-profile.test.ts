import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiServerFetch: vi.fn()
}))

vi.mock('@/lib/api-server', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/api-server')>()
  return { ...actual, apiServerFetch: mocks.apiServerFetch }
})

import { ApiServerError } from '@/lib/api-server'
import { getProfile } from './get-profile'

describe('getProfile', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('keeps a forbidden server response typed for the account layout', async () => {
    const error = new ApiServerError(
      403,
      'FORBIDDEN',
      'Access denied',
      {},
      'profile-forbidden'
    )
    mocks.apiServerFetch.mockRejectedValue(error)

    await expect(getProfile()).rejects.toBe(error)
  })

  it('adapts the canonical profile response and derives email from GitHub connections', async () => {
    mocks.apiServerFetch.mockResolvedValue({
      profile: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        displayName: 'Ada',
        avatarUrl: null,
        bio: null,
        timezone: 'Asia/Bangkok',
        platformRole: 'USER',
        accountStatus: 'APPROVED',
        createdAt: '2026-09-10T00:00:00.000Z',
        updatedAt: '2026-09-10T00:00:00.000Z'
      },
      connections: [{
        id: '650e8400-e29b-41d4-a716-446655440000',
        provider: 'GITHUB',
        username: 'ada',
        email: 'ada@example.com',
        connectedAt: '2026-09-10T00:00:00.000Z'
      }]
    })

    await expect(getProfile()).resolves.toMatchObject({
      name: 'Ada',
      email: 'ada@example.com',
      connections: [{ provider: 'GITHUB' }]
    })
  })
})
