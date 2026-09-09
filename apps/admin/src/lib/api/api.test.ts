import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BaseQueryApi } from '@reduxjs/toolkit/query'
import { api, baseQuery } from './api'
import { setUser } from '@/lib/features/auth/auth-slice'

function createQueryContext(
  dispatch: ReturnType<typeof vi.fn>
): BaseQueryApi {
  return {
    signal: new AbortController().signal,
    abort: vi.fn(),
    dispatch: dispatch as unknown as BaseQueryApi['dispatch'],
    getState: vi.fn(),
    extra: undefined,
    endpoint: 'test',
    type: 'query' as const
  }
}

describe('browser API root', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('unwraps the standard success envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { id: 'resource-id' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
    )

    const result = await baseQuery('resource', createQueryContext(vi.fn()), {})

    expect(result).toMatchObject({ data: { id: 'resource-id' } })
  })

  it('clears session and the whole API cache on 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED' } }), {
          status: 401,
          headers: { 'content-type': 'application/json' }
        })
      )
    )
    const dispatch = vi.fn()

    const result = await baseQuery(
      'resource',
      createQueryContext(dispatch),
      {}
    )

    expect(result).toMatchObject({ error: { status: 401 } })
    expect(dispatch).toHaveBeenCalledWith(setUser(null))
    expect(dispatch).toHaveBeenCalledWith(api.util.resetApiState())
  })

  it('leaves 403 as a typed query error for the UI', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied',
              details: {},
              requestId: 'request-123'
            }
          }),
          {
            status: 403,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
    )
    const dispatch = vi.fn()

    const result = await baseQuery(
      'resource',
      createQueryContext(dispatch),
      {}
    )

    expect(result).toMatchObject({ error: { status: 403 } })
    expect(dispatch).not.toHaveBeenCalled()
  })
})
