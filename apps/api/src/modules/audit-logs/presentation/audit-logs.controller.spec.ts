import { describe, expect, it, vi } from 'vitest'
import type { EntityManager } from '@mikro-orm/core'
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js'
import { AuditLogsController } from './audit-logs.controller.js'

describe('AuditLogsController', () => {
  it('returns security logs in the standard success envelope', async () => {
    const em = {
      findAndCount: vi.fn().mockResolvedValue([
        [
          {
            id: 'security-1',
            organizationId: null,
            userId: 'user-1',
            event: 'LOGIN_SUCCEEDED',
            provider: 'GITHUB',
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
            metadata: null,
            createdAt: new Date('2026-09-10T00:00:00.000Z')
          }
        ],
        1
      ])
    } as unknown as EntityManager

    const controller = new AuditLogsController(em, {} as never)
    const response = await controller.listMySecurityLogs(
      { id: 'user-1' } as AuthenticatedPrincipal,
      {}
    )

    expect(response).toEqual({
      data: [
        expect.objectContaining({ id: 'security-1', event: 'LOGIN_SUCCEEDED' })
      ],
      meta: { total: 1, page: 1, pageSize: 25, totalPages: 1 }
    })
  })
})
