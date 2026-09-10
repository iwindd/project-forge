import { describe, expect, it } from 'vitest'
import { parseAuditLogsResponse } from './audit-logs-api'

describe('audit log API response contract', () => {
  it('parses records and total metadata after envelope unwrapping', () => {
    const result = parseAuditLogsResponse(
      [
        {
          id: 'audit-1',
          createdAt: '2026-09-10T00:00:00.000Z',
          action: 'PROFILE_UPDATED',
          resourceType: 'PROFILE',
          resourceId: 'user-1',
          actorRole: 'USER',
          actor: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
          target: null,
          reason: null,
          hasBefore: false,
          hasAfter: true
        }
      ],
      { apiMeta: { page: 1, pageSize: 25, total: 1, totalPages: 1 } }
    )

    expect(result).toEqual({
      data: [expect.objectContaining({ id: 'audit-1' })],
      total: 1
    })
  })
})
