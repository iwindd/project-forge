import { describe, expect, it } from 'vitest'
import { parseUsersResponse } from './users-api'

describe('users API response contract', () => {
  it('parses list payloads and normalizes legacy organization roles', () => {
    const result = parseUsersResponse(
      [
        {
          id: 'user-1',
          name: null,
          email: 'owner@example.com',
          role: {
            legacyRole: 'OWNER',
            isOwner: true
          },
          isActive: true,
          createdAt: '2026-09-10T00:00:00.000Z',
          updatedAt: '2026-09-10T00:00:00.000Z'
        },
        {
          id: 'user-2',
          name: 'Member',
          email: null,
          role: 'EDITOR',
          isActive: false,
          createdAt: '2026-09-10T00:00:00.000Z',
          updatedAt: '2026-09-10T00:00:00.000Z'
        }
      ],
      { apiMeta: { total: 2 } }
    )

    expect(result).toEqual({
      data: [
        expect.objectContaining({
          id: 'user-1',
          name: 'owner@example.com',
          role: 'ADMIN'
        }),
        expect.objectContaining({
          id: 'user-2',
          name: 'Member',
          email: '',
          role: 'EDITOR'
        })
      ],
      total: 2
    })
  })

  it('supports a legacy paginated payload while still validating its items', () => {
    const result = parseUsersResponse(
      {
        data: [
          {
            id: 'user-1',
            name: 'Admin',
            email: 'admin@example.com',
            role: 'ADMIN',
            isActive: true,
            createdAt: '2026-09-10T00:00:00.000Z',
            updatedAt: '2026-09-10T00:00:00.000Z'
          }
        ],
        total: 7,
        page: 1,
        pageSize: 10
      },
      undefined
    )

    expect(result.total).toBe(7)
    expect(result.data[0]?.role).toBe('ADMIN')
  })

  it('rejects a response with an invalid item contract', () => {
    expect(() =>
      parseUsersResponse(
        [{ id: 'user-1', role: 'NOT_A_ROLE' }],
        undefined
      )
    ).toThrow()
  })
})
