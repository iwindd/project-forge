import { EntityManager, type FilterQuery } from '@mikro-orm/core';
import { Inject } from '@nestjs/common';
import { Controller, ForbiddenException, Get, Param, Query, Res, NotFoundException, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { AuditQueryPort, AuditQueryScope } from '../../../common/audit/audit-query.port.js';
import { AUDIT_QUERY } from '../../../common/audit/audit-query.port.js';
import { AdminGuard } from '../../../common/auth/admin.guard.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { Principal } from '../../../common/auth/principal.decorator.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import { UserSecurityLogOrmEntity } from '../../../common/security/user-security-log.orm-entity.js';
import { apiSuccess } from '../../../common/http/api-response.js';
import { OrganizationService } from '../../organizations/application/organization.service.js';
import { ORGANIZATION_PERMISSIONS } from '../../organizations/domain/organization.js';
import {
  auditLogIdParamSchema,
  auditLogOrganizationParamSchema,
  auditLogOrganizationUserParamSchema,
  auditLogQuerySchema,
  auditLogUserParamSchema,
  type AuditLogQuery,
} from './dto/audit-log.schemas.js';
import {
  auditLogExportResponseSchema,
  auditLogListResponseSchema,
  securityLogListResponseSchema,
} from './dto/audit-log-response.schemas.js';

@Controller('audit-logs')
@UseGuards(SessionGuard)
export class AuditLogsController {
  constructor(
    private readonly em: EntityManager,
    private readonly organizations: OrganizationService,
    @Inject(AUDIT_QUERY) private readonly auditQuery: AuditQueryPort,
  ) {}

  @Get()
  @UseGuards(AdminGuard)
  list(@Query() rawQuery: unknown) {
    const query = auditLogQuerySchema.parse(rawQuery);
    return this.queryLogs(query, 'all');
  }

  @Get('me')
  listMine(@Principal() principal: AuthenticatedPrincipal, @Query() rawQuery: unknown) {
    const query = auditLogQuerySchema.parse(rawQuery);
    return this.queryLogs(query, { userId: principal.id });
  }

  @Get('users/:userId')
  @UseGuards(AdminGuard)
  listUser(@Param() rawParams: unknown, @Query() rawQuery: unknown) {
    const { userId } = auditLogUserParamSchema.parse(rawParams);
    const query = auditLogQuerySchema.parse(rawQuery);
    return this.queryLogs(query, { userId });
  }

  @Get('organization/:organizationId')
  async listOrganization(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Query() rawQuery: unknown,
  ) {
    const { organizationId } = auditLogOrganizationParamSchema.parse(rawParams);
    const query = auditLogQuerySchema.parse(rawQuery);
    await this.requireOrganizationViewer(principal, organizationId);
    return this.queryLogs(query, { organizationId });
  }

  @Get('organization/:organizationId/users/:userId')
  async listOrganizationUser(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Query() rawQuery: unknown,
  ) {
    const { organizationId, userId } = auditLogOrganizationUserParamSchema.parse(rawParams);
    const query = auditLogQuerySchema.parse(rawQuery);
    await this.requireOrganizationViewer(principal, organizationId);
    return this.queryLogs(query, { organizationId, userId });
  }

  @Get('security/me')
  listMySecurityLogs(@Principal() principal: AuthenticatedPrincipal, @Query() rawQuery: unknown) {
    const query = auditLogQuerySchema.parse(rawQuery);
    return this.querySecurityLogs(query, { userId: principal.id });
  }

  @Get('security/organization/:organizationId')
  async listOrganizationSecurityLogs(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Query() rawQuery: unknown,
  ) {
    const { organizationId } = auditLogOrganizationParamSchema.parse(rawParams);
    const query = auditLogQuerySchema.parse(rawQuery);
    await this.requireOrganizationViewer(principal, organizationId);
    return this.querySecurityLogs(query, { organizationId });
  }

  @Get('security/organization/:organizationId/users/:userId')
  async listOrganizationUserSecurityLogs(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Query() rawQuery: unknown,
  ) {
    const { organizationId, userId } = auditLogOrganizationUserParamSchema.parse(rawParams);
    const query = auditLogQuerySchema.parse(rawQuery);
    await this.requireOrganizationViewer(principal, organizationId);
    return this.querySecurityLogs(query, { organizationId, userId });
  }

  @Get(':id/export')
  @UseGuards(AdminGuard)
  async export(@Param() rawParams: unknown, @Res() response: Response) {
    const { id } = auditLogIdParamSchema.parse(rawParams);
    const log = await this.auditQuery.findExport(id);
    if (!log) throw newAuditLogNotFound();
    return response.json(auditLogExportResponseSchema.parse(apiSuccess(serializeAuditLogExport(log))));
  }

  @Get('me/:id/export')
  async exportMine(
    @Param() rawParams: unknown,
    @Principal() principal: AuthenticatedPrincipal,
    @Res() response: Response,
  ) {
    const { id } = auditLogIdParamSchema.parse(rawParams);
    const log = await this.auditQuery.findExport(id, { userId: principal.id });
    if (!log) throw newAuditLogNotFound();
    return response.json(auditLogExportResponseSchema.parse(apiSuccess(serializeAuditLogExport(log))));
  }

  @Get('organization/:organizationId/:id/export')
  async exportOrganization(
    @Param() rawParams: unknown,
    @Principal() principal: AuthenticatedPrincipal,
    @Res() response: Response,
  ) {
    const { organizationId, id } = auditLogOrganizationParamSchema.extend(auditLogIdParamSchema.shape).parse(rawParams);
    await this.requireOrganizationViewer(principal, organizationId);
    const log = await this.auditQuery.findExport(id, { organizationId });
    if (!log) throw newAuditLogNotFound();
    return response.json(auditLogExportResponseSchema.parse(apiSuccess(serializeAuditLogExport(log))));
  }

  private async queryLogs(query: AuditLogQuery, scope: AuditQueryScope) {
    const { logs, total } = await this.auditQuery.list(query, scope);
    const data = logs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    }));
    return auditLogListResponseSchema.parse(
      apiSuccess(data, {
        total,
        page: query.page,
        pageSize: query.limit,
        totalPages: Math.ceil(total / query.limit),
      }),
    );
  }

  private async querySecurityLogs(
    query: AuditLogQuery,
    scope: { userId: string } | { organizationId: string } | { organizationId: string; userId: string },
  ) {
    const page = query.page;
    const limit = query.limit;
    const where: FilterQuery<UserSecurityLogOrmEntity> =
      'organizationId' in scope && 'userId' in scope
        ? {
            $and: [{ organizationId: scope.organizationId }, { userId: scope.userId }],
          }
        : 'userId' in scope
          ? { userId: scope.userId }
          : { organizationId: scope.organizationId };
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { $gte: new Date(query.from) } : {}),
        ...(query.to ? { $lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
      };
    }
    const [logs, total] = await this.em.findAndCount(UserSecurityLogOrmEntity, where, {
      orderBy: { createdAt: 'DESC' },
      limit,
      offset: (page - 1) * limit,
    });
    return securityLogListResponseSchema.parse(
      apiSuccess(
        logs.map((log) => ({
          id: log.id,
          organizationId: log.organizationId,
          userId: log.userId,
          event: log.event,
          provider: log.provider,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          metadata: log.metadata,
          createdAt: log.createdAt.toISOString(),
        })),
        {
          total,
          page,
          pageSize: limit,
          totalPages: Math.ceil(total / limit),
        },
      ),
    );
  }

  private async requireOrganizationViewer(principal: AuthenticatedPrincipal, organizationId: string) {
    if (principal.role === 'ADMIN') return this.organizations.requireMembership(principal.id, organizationId);
    const { role } = await this.organizations.requireMembership(principal.id, organizationId);
    if (!role.isOwner && !role.permissions.includes(ORGANIZATION_PERMISSIONS.MANAGE)) {
      throw new ForbiddenException({
        code: 'ORGANIZATION_ADMIN_REQUIRED',
        message: 'Organization administrator access is required',
      });
    }
    return role;
  }
}

function newAuditLogNotFound() {
  return new NotFoundException({
    code: 'AUDIT_LOG_NOT_FOUND',
    message: 'Audit log was not found',
  });
}

function serializeAuditLogExport(log: {
  id: string;
  organizationId: string | null;
  actorId: string | null;
  targetUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  reason: string | null;
  requestId: string | null;
  createdAt: Date;
}) {
  return {
    id: log.id,
    organizationId: log.organizationId,
    actorId: log.actorId,
    targetUserId: log.targetUserId,
    action: log.action,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    beforeJson: log.beforeJson,
    afterJson: log.afterJson,
    reason: log.reason,
    requestId: log.requestId,
    createdAt: log.createdAt.toISOString(),
  };
}
