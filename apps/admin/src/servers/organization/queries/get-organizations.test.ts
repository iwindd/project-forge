import { describe, expect, it, vi } from 'vitest'
import { organizationListSchema } from '@/lib/features/organization/organization-schemas'

const mocks = vi.hoisted(() => ({
  apiServerFetch: vi.fn()
}))

vi.mock('@/lib/api-server', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/api-server')>()
  return { ...actual, apiServerFetch: mocks.apiServerFetch }
})

import { ApiServerError } from '@/lib/api-server'
import { getOrganizations } from './get-organizations'

describe('organization list response contract', () => {
  it('accepts the organization context returned by the API', () => {
    const result = organizationListSchema.parse([
      {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Personal Workspace',
        slug: 'personal-workspace',
        type: 'PERSONAL',
        role: {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'เจ้าของ',
          permissions: ['organization.manage'],
          isOwner: true,
          code: 'OWNER'
        },
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ])

    expect(result[0]?.role.name).toBe('เจ้าของ')
  })

  it('propagates forbidden responses instead of treating them as an empty list', async () => {
    const error = new ApiServerError(
      403,
      'ORGANIZATION_FORBIDDEN',
      'Organization access is forbidden',
      {},
      'request-forbidden'
    )
    mocks.apiServerFetch.mockRejectedValueOnce(error)

    await expect(getOrganizations()).rejects.toBe(error)
  })
})
