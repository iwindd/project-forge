import { EntityManager, FilterQuery } from '@mikro-orm/core'
import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  Res,
  UseGuards
} from '@nestjs/common'
import type { Response } from 'express'
import { AuditLogOrmEntity } from '../../../common/audit/audit-log.orm-entity.js'
import { AdminGuard } from '../../../common/auth/admin.guard.js'
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js'
import { Principal } from '../../../common/auth/principal.decorator.js'
import { SessionGuard } from '../../../common/auth/session.guard.js'
import { UserSecurityLogOrmEntity } from '../../../common/security/user-security-log.orm-entity.js'
import { OrganizationService } from '../../organizations/application/organization.service.js'
import { ORGANIZATION_PERMISSIONS } from '../../organizations/domain/organization.js'
import { UserOrmEntity } from '../../users/infrastructure/persistence/user.orm-entity.js'

type AuditQuery = {
  search?: string
  actions?: string
  resourceTypes?: string
  from?: string
  to?: string
  organizationId?: string
  page?: string
  limit?: string
}

@Controller('audit-logs')
@UseGuards(SessionGuard)
export class AuditLogsController {
  constructor(
    private readonly em: EntityManager,
    private readonly organizations: OrganizationService
  ) {}

  @Get()
  @UseGuards(AdminGuard)
  list(@Query() query: AuditQuery) {
    return this.queryLogs(query, 'all')
  }

  @Get('me')
  listMine(
    @Principal() principal: AuthenticatedPrincipal,
    @Query() query: AuditQuery
  ) {
    return this.queryLogs(query, { userId: principal.id })
  }

  @Get('users/:userId')
  @UseGuards(AdminGuard)
  listUser(@Param('userId') userId: string, @Query() query: AuditQuery) {
    return this.queryLogs(query, { userId })
  }

  @Get('organization/:organizationId')
  async listOrganization(
    @Principal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Query() query: AuditQuery
  ) {
    await this.requireOrganizationViewer(principal, organizationId)
    return this.queryLogs(query, { organizationId })
  }

  @Get('organization/:organizationId/users/:userId')
  async listOrganizationUser(
    @Principal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @Query() query: AuditQuery
  ) {
    await this.requireOrganizationViewer(principal, organizationId)
    return this.queryLogs(query, { organizationId, userId })
  }

  @Get('security/me')
  listMySecurityLogs(
    @Principal() principal: AuthenticatedPrincipal,
    @Query() query: AuditQuery
  ) {
    return this.querySecurityLogs(query, { userId: principal.id })
  }

  @Get('security/organization/:organizationId')
  async listOrganizationSecurityLogs(
    @Principal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Query() query: AuditQuery
  ) {
    await this.requireOrganizationViewer(principal, organizationId)
    return this.querySecurityLogs(query, { organizationId })
  }

  @Get('security/organization/:organizationId/users/:userId')
  async listOrganizationUserSecurityLogs(
    @Principal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @Query() query: AuditQuery
  ) {
    await this.requireOrganizationViewer(principal, organizationId)
    return this.querySecurityLogs(query, { organizationId, userId })
  }

  @Get(':id/export')
  @UseGuards(AdminGuard)
  async export(@Param('id') id: string, @Res() response: Response) {
    const log = await this.em.findOne(AuditLogOrmEntity, { id })
    if (!log)
      return response.status(404).json({ message: 'Audit log was not found' })
    return response.json(log)
  }

  @Get('me/:id/export')
  async exportMine(
    @Param('id') id: string,
    @Principal() principal: AuthenticatedPrincipal,
    @Res() response: Response
  ) {
    const log = await this.em.findOne(AuditLogOrmEntity, { id })
    if (
      !log ||
      (log.actorId !== principal.id && log.targetUserId !== principal.id)
    ) {
      return response.status(404).json({ message: 'Audit log was not found' })
    }
    return response.json(log)
  }

  @Get('organization/:organizationId/:id/export')
  async exportOrganization(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Principal() principal: AuthenticatedPrincipal,
    @Res() response: Response
  ) {
    await this.requireOrganizationViewer(principal, organizationId)
    const log = await this.em.findOne(AuditLogOrmEntity, { id, organizationId })
    if (!log)
      return response.status(404).json({ message: 'Audit log was not found' })
    return response.json(log)
  }

  private async queryLogs(
    query: AuditQuery,
    scope:
      | 'all'
      | { userId: string }
      | { organizationId: string }
      | { organizationId: string; userId: string }
  ) {
    const page = Math.max(Number(query.page) || 1, 1)
    const limit = Math.min(Math.max(Number(query.limit) || 25, 1), 100)
    const where: FilterQuery<AuditLogOrmEntity> = {}

    const andConditions: FilterQuery<AuditLogOrmEntity>[] = []
    if (scope !== 'all' && 'userId' in scope)
      andConditions.push({
        $or: [{ actorId: scope.userId }, { targetUserId: scope.userId }]
      })
    if (scope !== 'all' && 'organizationId' in scope)
      andConditions.push({ organizationId: scope.organizationId })
    if (query.actions)
      where.action = { $in: query.actions.split(',').filter(Boolean) }
    if (query.resourceTypes)
      where.resourceType = {
        $in: query.resourceTypes.split(',').filter(Boolean)
      }
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { $gte: new Date(query.from) } : {}),
        ...(query.to ? { $lte: new Date(`${query.to}T23:59:59.999Z`) } : {})
      }
    }
    if (query.search?.trim()) {
      const search = query.search.trim()
      andConditions.push({
        $or: [
          { action: { $ilike: `%${search}%` } },
          { resourceType: { $ilike: `%${search}%` } },
          { resourceId: { $ilike: `%${search}%` } },
          { reason: { $ilike: `%${search}%` } }
        ]
      })
    }
    if (andConditions.length) where.$and = andConditions

    const [logs, total] = await this.em.findAndCount(AuditLogOrmEntity, where, {
      orderBy: { createdAt: 'DESC' },
      limit,
      offset: (page - 1) * limit
    })
    const userIds = [
      ...new Set(
        logs.flatMap(log => [log.actorId, log.targetUserId]).filter(Boolean)
      )
    ] as string[]
    const users = await this.em.find(UserOrmEntity, { id: { $in: userIds } })
    const userMap = new Map(users.map(user => [user.id, user]))
    const summary = (id: string | null) => {
      if (!id) return null
      const user = userMap.get(id)
      return user
        ? {
            id: user.id,
            name: user.name ?? user.githubLogin,
            email: user.githubLogin
          }
        : null
    }

    return {
      data: logs.map(log => ({
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        actorRole: log.actorId
          ? (userMap.get(log.actorId)?.role ?? null)
          : null,
        actor: summary(log.actorId),
        target: summary(log.targetUserId),
        reason: log.reason,
        hasBefore: Boolean(log.beforeJson),
        hasAfter: Boolean(log.afterJson)
      })),
      total,
      page,
      limit
    }
  }

  private async querySecurityLogs(
    query: AuditQuery,
    scope:
      | { userId: string }
      | { organizationId: string }
      | { organizationId: string; userId: string }
  ) {
    const page = Math.max(Number(query.page) || 1, 1)
    const limit = Math.min(Math.max(Number(query.limit) || 25, 1), 100)
    const where: FilterQuery<UserSecurityLogOrmEntity> =
      'organizationId' in scope && 'userId' in scope
        ? {
            $and: [
              { organizationId: scope.organizationId },
              { userId: scope.userId }
            ]
          }
        : 'userId' in scope
          ? { userId: scope.userId }
          : { organizationId: scope.organizationId }
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { $gte: new Date(query.from) } : {}),
        ...(query.to ? { $lte: new Date(`${query.to}T23:59:59.999Z`) } : {})
      }
    }
    const [logs, total] = await this.em.findAndCount(
      UserSecurityLogOrmEntity,
      where,
      {
        orderBy: { createdAt: 'DESC' },
        limit,
        offset: (page - 1) * limit
      }
    )
    return {
      data: logs.map(log => ({
        id: log.id,
        organizationId: log.organizationId,
        userId: log.userId,
        event: log.event,
        provider: log.provider,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString()
      })),
      total,
      page,
      limit
    }
  }

  private async requireOrganizationViewer(
    principal: AuthenticatedPrincipal,
    organizationId: string
  ) {
    if (principal.role === 'ADMIN')
      return this.organizations.requireMembership(principal.id, organizationId)
    const { role } = await this.organizations.requireMembership(
      principal.id,
      organizationId
    )
    if (
      !role.isOwner &&
      !role.permissions.includes(ORGANIZATION_PERMISSIONS.MANAGE)
    ) {
      throw new ForbiddenException({
        code: 'ORGANIZATION_ADMIN_REQUIRED',
        message: 'Organization administrator access is required'
      })
    }
    return role
  }
}
