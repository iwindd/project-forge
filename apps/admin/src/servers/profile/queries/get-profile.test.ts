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
})
