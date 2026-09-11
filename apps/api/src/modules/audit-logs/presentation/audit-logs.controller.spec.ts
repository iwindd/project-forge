import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { EntityManager } from '@mikro-orm/core';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { PublicErrorFilter } from '../../../common/errors/public-error.filter.js';
import { auditLogQuerySchema } from './dto/audit-log.schemas.js';
import { AuditLogsController } from './audit-logs.controller.js';

const auditLogId = '550e8400-e29b-41d4-a716-446655440010';
const organizationId = '550e8400-e29b-41d4-a716-446655440011';
const userId = '550e8400-e29b-41d4-a716-446655440012';

function expectStandardNotFoundEnvelope(exception: unknown) {
  const response = {
    header: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  const request = {
    header: vi.fn().mockReturnValue('audit-request'),
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  };

  new PublicErrorFilter().catch(exception, host as never);

  expect(response.status).toHaveBeenCalledWith(404);
  expect(response.json).toHaveBeenCalledWith({
    error: {
      code: 'AUDIT_LOG_NOT_FOUND',
      message: 'Audit log was not found',
      details: {},
      requestId: 'audit-request',
    },
  });
}

describe('AuditLogsController', () => {
  it('validates audit date filters as calendar dates and ordered ranges', () => {
    expect(
      auditLogQuerySchema.parse({
        from: '2026-09-01',
        to: '2026-09-10',
      }),
    ).toMatchObject({ from: '2026-09-01', to: '2026-09-10' });

    expect(() => auditLogQuerySchema.parse({ from: '2026-02-30' })).toThrow();
    expect(() => auditLogQuerySchema.parse({ from: '2026-09-10', to: '2026-09-01' })).toThrow();
  });

  it('returns security logs in the standard success envelope', async () => {
    const em = {
      findAndCount: vi.fn().mockResolvedValue([
        [
          {
            id: auditLogId,
            organizationId: null,
            userId,
            event: 'LOGIN_SUCCEEDED',
            provider: 'GITHUB',
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
            metadata: null,
            createdAt: new Date('2026-09-10T00:00:00.000Z'),
          },
        ],
        1,
      ]),
    } as unknown as EntityManager;

    const controller = new AuditLogsController(em, {} as never, {
      list: vi.fn(),
      findExport: vi.fn(),
    });
    const response = await controller.listMySecurityLogs({ id: userId } as AuthenticatedPrincipal, {});

    expect(response).toEqual({
      data: [expect.objectContaining({ id: auditLogId, event: 'LOGIN_SUCCEEDED' })],
      meta: { total: 1, page: 1, pageSize: 25, totalPages: 1 },
    });
  });

  it('returns an audit export through the response object when the log exists', async () => {
    const log = {
      id: auditLogId,
      organizationId,
      actorId: userId,
      targetUserId: null,
      action: 'PROFILE_UPDATED',
      resourceType: 'PROFILE',
      resourceId: userId,
      beforeJson: null,
      afterJson: { displayName: 'Updated' },
      reason: null,
      requestId: 'audit-request',
      createdAt: new Date('2026-09-10T00:00:00.000Z'),
    };
    const em = {
      findOne: vi.fn().mockResolvedValue(log),
    } as unknown as EntityManager;
    const response = {
      json: vi.fn().mockReturnValue(log),
    };
    const auditQuery = {
      list: vi.fn(),
      findExport: vi.fn().mockResolvedValue(log),
    };
    const controller = new AuditLogsController(em, {} as never, auditQuery);
    await expect(controller.export({ id: auditLogId }, response as never)).resolves.toEqual(log);

    expect(response.json).toHaveBeenCalledWith({
      data: {
        ...log,
        createdAt: log.createdAt.toISOString(),
      },
    });
  });

  it.each([
    [
      'admin export',
      (controller: AuditLogsController, response: unknown) => controller.export({ id: auditLogId }, response as never),
    ],
    [
      'personal export',
      (controller: AuditLogsController, response: unknown) =>
        controller.exportMine({ id: auditLogId }, { id: userId } as AuthenticatedPrincipal, response as never),
    ],
    [
      'organization export',
      (controller: AuditLogsController, response: unknown) =>
        controller.exportOrganization(
          { organizationId, id: auditLogId },
          { id: userId } as AuthenticatedPrincipal,
          response as never,
        ),
    ],
  ])('passes %s not-found errors to PublicErrorFilter', async (_name, invoke) => {
    const em = {
      findOne: vi.fn().mockResolvedValue(null),
    } as unknown as EntityManager;
    const response = { json: vi.fn() };
    const controller = new AuditLogsController(
      em,
      {
        requireMembership: vi.fn().mockResolvedValue({
          role: { isOwner: true, permissions: [] },
        }),
      } as never,
      {
        list: vi.fn(),
        findExport: vi.fn().mockResolvedValue(null),
      },
    );

    const error = await invoke(controller, response).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(NotFoundException);
    expectStandardNotFoundEnvelope(error);
    expect(response.json).not.toHaveBeenCalled();
  });

  it('delegates organization audit reads with an organization scope after permission checks', async () => {
    const auditQuery = {
      list: vi.fn().mockResolvedValue({ logs: [], total: 0 }),
      findExport: vi.fn(),
    };
    const organizations = {
      requireMembership: vi.fn().mockResolvedValue({
        role: { isOwner: true, permissions: [] },
      }),
    };
    const controller = new AuditLogsController({} as never, organizations as never, auditQuery);

    await expect(
      controller.listOrganization({ id: userId, role: 'USER' } as AuthenticatedPrincipal, { organizationId }, {}),
    ).resolves.toEqual({
      data: [],
      meta: { total: 0, page: 1, pageSize: 25, totalPages: 0 },
    });
    expect(organizations.requireMembership).toHaveBeenCalledWith(userId, organizationId);
    expect(auditQuery.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 25 }), { organizationId });
  });
});
