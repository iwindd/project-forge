import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPreloadedState, makeStore } from '@/lib/store'
import { organizationMembersApi } from './organization-members-api'
import { resolveOrganizationFromRoute } from './organization-context'

const organizations = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Organization A',
    slug: 'organization-a',
    type: 'SHARED' as const,
    role: {
      id: '00000000-0000-0000-0000-000000000011',
      name: 'แอดมิน',
      permissions: ['organization.manage'],
      isOwner: false,
      code: 'ADMIN' as const
    },
    status: 'ACTIVE' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z'
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Organization B',
    slug: 'organization-b',
    type: 'SHARED' as const,
    role: {
      id: '00000000-0000-0000-0000-000000000012',
      name: 'สมาชิก',
      permissions: [],
      isOwner: false,
      code: 'MEMBER' as const
    },
    status: 'ACTIVE' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z'
  }
]

describe('organization route and preload seam', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('preloads the organizations and sends the route-resolved id to the browser API', async () => {
    const selected = resolveOrganizationFromRoute(
      organizations,
      'organization-b',
      organizations[1].id
    )
    expect(selected?.id).toBe(organizations[1].id)

    const preloadedState = await createPreloadedState(
      { user: { id: 'user-id', role: 'EDITOR' } },
      organizations
    )
    expect(
      preloadedState.api?.queries['getOrganizations(undefined)']
    ).toMatchObject({ data: organizations, status: 'fulfilled' })

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [],
          meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 }
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const store = makeStore({
      auth: { user: { id: 'user-id', role: 'EDITOR' } }
    })
    await store.dispatch(
      organizationMembersApi.endpoints.getMembers.initiate({
        organizationId: selected?.id ?? '',
        query: { page: 1, pageSize: 10 }
      })
    )

    const [request] = fetchMock.mock.calls[0] ?? []
    const requestUrl = request instanceof Request ? request.url : String(request)
    expect(requestUrl).toContain(
      `/organizations/${organizations[1].id}/members`
    )
  })
})
