import { describe, expect, it } from 'vitest'
import {
  getAuditLogExportPath,
  parseAuditLogExportResponse,
  parseAuditLogsResponse
} from './audit-logs-api'

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

describe('audit log export transport', () => {
  it('keeps successful export responses serializable for RTK Query', async () => {
    const payload = {
      data: {
        id: 'audit-1',
        organizationId: null,
        actorId: 'user-1',
        targetUserId: null,
        action: 'PROFILE_UPDATED',
        resourceType: 'PROFILE',
        resourceId: 'user-1',
        beforeJson: null,
        afterJson: { displayName: 'Updated' },
        reason: null,
        requestId: 'audit-request',
        createdAt: '2026-09-10T00:00:00.000Z'
      }
    }
    const response = new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })

    const result = await parseAuditLogExportResponse(response)

    expect(result).toBe(JSON.stringify(payload, null, 2))
  })

  it('preserves the standard JSON error envelope for failed exports', async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          code: 'AUDIT_LOG_NOT_FOUND',
          message: 'Audit log was not found',
          details: {},
          requestId: 'audit-request'
        }
      }),
      {
        status: 404,
        headers: { 'content-type': 'application/json' }
      }
    )

    await expect(parseAuditLogExportResponse(response)).resolves.toEqual({
      error: {
        code: 'AUDIT_LOG_NOT_FOUND',
        message: 'Audit log was not found',
        details: {},
        requestId: 'audit-request'
      }
    })
  })

  it('builds an API-root-relative export path for the active organization', () => {
    expect(
      getAuditLogExportPath(
        { kind: 'all' },
        'audit/log',
        'organization/one'
      )
    ).toBe(
      'audit-logs/organization/organization%2Fone/audit%2Flog/export'
    )
  })
})
