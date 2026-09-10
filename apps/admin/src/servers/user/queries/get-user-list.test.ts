import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ cookies: vi.fn() }))

vi.mock('next/headers', () => ({ cookies: mocks.cookies }))

import { getUserList } from './get-user-list'

describe('getUserList', () => {
  beforeEach(() => {
    mocks.cookies.mockResolvedValue({
      toString: () => 'pf_session=session-token'
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('maps the unwrapped paginated user response from the server client', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'user-id',
                name: 'User',
                email: 'user@example.com',
                role: 'ADMIN',
                isActive: true,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-02T00:00:00.000Z'
              }
            ],
            meta: {
              page: 1,
              pageSize: 25,
              total: 1,
              totalPages: 1
            }
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      getUserList({
        page: 1,
        pageSize: 25,
        search: '',
        status: 'all',
        sortBy: 'createdAt',
        sortDirection: 'desc'
      })
    ).resolves.toEqual({
      data: [
        {
          id: 'user-id',
          name: 'User',
          email: 'user@example.com',
          role: 'ADMIN',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z'
        }
      ],
      total: 1
    })

    const requestUrl = new URL(fetchMock.mock.calls[0]?.[0] as string)
    expect(requestUrl.searchParams.get('pageSize')).toBe('25')
    expect(requestUrl.searchParams.has('limit')).toBe(false)
  })
})
