import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

const mocks = vi.hoisted(() => ({ cookies: vi.fn() }))

vi.mock('next/headers', () => ({ cookies: mocks.cookies }))

import { apiServerFetch, apiServerFetchEnvelope } from './api-server'

describe('apiServerFetch', () => {
  beforeEach(() => {
    mocks.cookies.mockResolvedValue({
      toString: () => 'pf_session=session-token'
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('parses the success envelope with the caller schema', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { id: 'resource-id' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
    )

    await expect(
      apiServerFetch(
        'resource',
        z.object({ id: z.string() })
      )
    ).resolves.toEqual({ id: 'resource-id' })
  })

  it('returns typed metadata alongside the unwrapped success data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [{ id: 'resource-id' }],
            meta: { page: 1, total: 1 }
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
    )

    await expect(
      apiServerFetchEnvelope(
        'resource',
        z.array(z.object({ id: z.string() })),
        z.object({ page: z.number(), total: z.number() })
      )
    ).resolves.toEqual({
      data: [{ id: 'resource-id' }],
      meta: { page: 1, total: 1 }
    })
  })

  it('exposes the standard error contract as a typed server error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied',
              details: { organizationId: 'organization-id' },
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

    await expect(
      apiServerFetch('resource', z.object({ id: z.string() }))
    ).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      requestId: 'request-123'
    })
  })
})
