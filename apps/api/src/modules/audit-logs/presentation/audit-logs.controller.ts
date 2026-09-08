import { EntityManager, FilterQuery } from '@mikro-orm/core';
import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AdminGuard } from '../../../common/auth/admin.guard.js';
import { Principal } from '../../../common/auth/principal.decorator.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { AuditLogOrmEntity } from '../../../common/audit/audit-log.orm-entity.js';
import { UserOrmEntity } from '../../users/infrastructure/persistence/user.orm-entity.js';

type AuditQuery = {
  search?: string;
  actions?: string;
  resourceTypes?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
};

@Controller('audit-logs')
@UseGuards(SessionGuard)
export class AuditLogsController {
  constructor(private readonly em: EntityManager) {}

  @Get()
  @UseGuards(AdminGuard)
  list(@Query() query: AuditQuery) {
    return this.queryLogs(query, 'all');
  }

  @Get('me')
  listMine(@Principal() principal: AuthenticatedPrincipal, @Query() query: AuditQuery) {
    return this.queryLogs(query, { userId: principal.id });
  }

  @Get('users/:userId')
  @UseGuards(AdminGuard)
  listUser(@Param('userId') userId: string, @Query() query: AuditQuery) {
    return this.queryLogs(query, { userId });
  }

  @Get(':id/export')
  @UseGuards(AdminGuard)
  async export(@Param('id') id: string, @Res() response: Response) {
    const log = await this.em.findOne(AuditLogOrmEntity, { id });
    if (!log) return response.status(404).json({ message: 'Audit log was not found' });
    return response.json(log);
  }

  private async queryLogs(query: AuditQuery, scope: 'all' | { userId: string }) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 25, 1), 100);
    const where: FilterQuery<AuditLogOrmEntity> = {};

    if (scope !== 'all') {
      where.$or = [{ actorId: scope.userId }, { targetUserId: scope.userId }];
    }
    if (query.actions) where.action = { $in: query.actions.split(',').filter(Boolean) };
    if (query.resourceTypes) where.resourceType = { $in: query.resourceTypes.split(',').filter(Boolean) };
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { $gte: new Date(query.from) } : {}),
        ...(query.to ? { $lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
      };
    }
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.$or = [
        ...(where.$or ?? []),
        { action: { $ilike: `%${search}%` } },
        { resourceType: { $ilike: `%${search}%` } },
        { resourceId: { $ilike: `%${search}%` } },
        { reason: { $ilike: `%${search}%` } },
      ];
    }

    const [logs, total] = await this.em.findAndCount(AuditLogOrmEntity, where, {
      orderBy: { createdAt: 'DESC' },
      limit,
      offset: (page - 1) * limit,
    });
    const userIds = [...new Set(logs.flatMap((log) => [log.actorId, log.targetUserId]).filter(Boolean))] as string[];
    const users = await this.em.find(UserOrmEntity, { id: { $in: userIds } });
    const userMap = new Map(users.map((user) => [user.id, user]));
    const summary = (id: string | null) => {
      if (!id) return null;
      const user = userMap.get(id);
      return user
        ? { id: user.id, name: user.name ?? user.githubLogin, email: user.githubLogin }
        : null;
    };

    return {
      data: logs.map((log) => ({
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        actorRole: log.actorId ? userMap.get(log.actorId)?.role ?? null : null,
        actor: summary(log.actorId),
        target: summary(log.targetUserId),
        reason: log.reason,
        hasBefore: Boolean(log.beforeJson),
        hasAfter: Boolean(log.afterJson),
      })),
      total,
      page,
      limit,
    };
  }
}
