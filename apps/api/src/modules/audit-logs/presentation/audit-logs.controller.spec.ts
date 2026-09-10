import { NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { EntityManager } from '@mikro-orm/core'
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js'
import { PublicErrorFilter } from '../../../common/errors/public-error.filter.js'
import { AuditLogsController } from './audit-logs.controller.js'

const auditLogId = '550e8400-e29b-41d4-a716-446655440010'
const organizationId = '550e8400-e29b-41d4-a716-446655440011'
const userId = '550e8400-e29b-41d4-a716-446655440012'

function expectStandardNotFoundEnvelope(exception: unknown) {
  const response = {
    header: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn()
  }
  const request = {
    header: vi.fn().mockReturnValue('audit-request')
  }
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request
    })
  }

  new PublicErrorFilter().catch(exception, host as never)

  expect(response.status).toHaveBeenCalledWith(404)
  expect(response.json).toHaveBeenCalledWith({
    error: {
      code: 'AUDIT_LOG_NOT_FOUND',
      message: 'Audit log was not found',
      details: {},
      requestId: 'audit-request'
    }
  })
}

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

  it('returns an audit export through the response object when the log exists', async () => {
    const log = { id: auditLogId, action: 'PROFILE_UPDATED' }
    const em = {
      findOne: vi.fn().mockResolvedValue(log)
    } as unknown as EntityManager
    const response = {
      json: vi.fn().mockReturnValue(log)
    }
    const controller = new AuditLogsController(em, {} as never)

    await expect(
      controller.export({ id: auditLogId }, response as never)
    ).resolves.toEqual(log)

    expect(response.json).toHaveBeenCalledWith(log)
  })

  it.each([
    ['admin export', (controller: AuditLogsController, response: unknown) =>
      controller.export({ id: auditLogId }, response as never)],
    [
      'personal export',
      (controller: AuditLogsController, response: unknown) =>
        controller.exportMine(
          { id: auditLogId },
          { id: userId } as AuthenticatedPrincipal,
          response as never
        )
    ],
    [
      'organization export',
      (controller: AuditLogsController, response: unknown) =>
        controller.exportOrganization(
          { organizationId, id: auditLogId },
          { id: userId } as AuthenticatedPrincipal,
          response as never
        )
    ]
  ])('passes %s not-found errors to PublicErrorFilter', async (_name, invoke) => {
    const em = {
      findOne: vi.fn().mockResolvedValue(null)
    } as unknown as EntityManager
    const response = { json: vi.fn() }
    const controller = new AuditLogsController(em, {
      requireMembership: vi.fn().mockResolvedValue({
        role: { isOwner: true, permissions: [] }
      })
    } as never)

    const error = await invoke(controller, response).catch((value: unknown) => value)

    expect(error).toBeInstanceOf(NotFoundException)
    expectStandardNotFoundEnvelope(error)
    expect(response.json).not.toHaveBeenCalled()
  })
})
