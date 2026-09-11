import { configureStore } from '@reduxjs/toolkit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/api'
import { profileApi } from './profile-api'

const profileResponse = {
  profile: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    displayName: 'Ada',
    avatarUrl: null,
    bio: null,
    timezone: 'Asia/Bangkok',
    platformRole: 'USER' as const,
    accountStatus: 'APPROVED' as const,
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z'
  },
  connections: [{
    id: '650e8400-e29b-41d4-a716-446655440000',
    provider: 'GITHUB' as const,
    username: 'ada',
    email: 'ada@example.com',
    connectedAt: '2026-09-10T00:00:00.000Z'
  }]
}

function createStore() {
  return configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(api.middleware)
  })
}

describe('profile browser API contracts', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('transforms the canonical profile and derives identity from GitHub connections', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: profileResponse }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await createStore().dispatch(
      profileApi.endpoints.getProfile.initiate()
    )

    expect(result).toMatchObject({
      data: {
        id: profileResponse.profile.id,
        name: 'Ada',
        email: 'ada@example.com',
        role: 'EDITOR',
        connections: [{ provider: 'GITHUB', username: 'ada' }]
      }
    })
    const request = fetchMock.mock.calls[0][0] as Request
    expect(request.url).toBe('http://localhost:5050/api/v1/profile')
    expect(request.credentials).toBe('include')
  })

  it('sends the profile mutation contract and exposes the validated response', async () => {
    const response = {
      profile: {
        id: profileResponse.profile.id,
        displayName: 'Ada Lovelace',
        avatarUrl: null,
        bio: 'Analyst',
        timezone: 'Asia/Bangkok',
        updatedAt: '2026-09-11T00:00:00.000Z'
      }
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: response }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await createStore().dispatch(
      profileApi.endpoints.updateProfile.initiate({
        displayName: ' Ada Lovelace ',
        bio: ' Analyst ',
        timezone: ' Asia/Bangkok '
      })
    )

    expect(result).toMatchObject({ data: response })
    const request = fetchMock.mock.calls[0][0] as Request
    expect(request.url).toBe('http://localhost:5050/api/v1/profile')
    expect(request.method).toBe('PATCH')
    expect(await request.text()).toBe(JSON.stringify({
      displayName: 'Ada Lovelace',
      bio: 'Analyst',
      timezone: 'Asia/Bangkok'
    }))
  })

  it('encodes a connection id and validates the null disconnect response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: null }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await createStore().dispatch(
      profileApi.endpoints.disconnectConnection.initiate('connection/id')
    )

    expect(result).toEqual(expect.objectContaining({ data: null }))
    const request = fetchMock.mock.calls[0][0] as Request
    expect(request.url).toBe('http://localhost:5050/api/v1/connections/connection%2Fid')
    expect(request.method).toBe('DELETE')
  })

  it('rejects malformed mutation output instead of showing success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { profile: {} } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
    )

    const result = await createStore().dispatch(
      profileApi.endpoints.updateProfile.initiate({ bio: null })
    )

    expect(result).toMatchObject({ error: { name: 'ZodError' } })
  })
})
