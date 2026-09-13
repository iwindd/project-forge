import { EntityManager, type FilterQuery } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { AuditLogOrmEntity } from './audit-log.orm-entity.js';
import type {
  AuditLogExport,
  AuditLogListItem,
  AuditQuery,
  AuditQueryPort,
  AuditQueryScope,
} from './audit-query.port.js';
import { UserOrmEntity } from '../../modules/users/infrastructure/persistence/user.orm-entity.js';

@Injectable()
export class MikroOrmAuditQueryAdapter implements AuditQueryPort {
  constructor(private readonly em: EntityManager) {}

  async list(query: AuditQuery, scope: AuditQueryScope) {
    const where: FilterQuery<AuditLogOrmEntity> = {};
    const andConditions: FilterQuery<AuditLogOrmEntity>[] = [];
    if (scope !== 'all' && 'userId' in scope)
      andConditions.push({ $or: [{ actorId: scope.userId }, { targetUserId: scope.userId }] });
    if (scope !== 'all' && 'organizationId' in scope) andConditions.push({ organizationId: scope.organizationId });
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
      andConditions.push({
        $or: [
          { action: { $ilike: `%${search}%` } },
          { resourceType: { $ilike: `%${search}%` } },
          { resourceId: { $ilike: `%${search}%` } },
          { reason: { $ilike: `%${search}%` } },
        ],
      });
    }
    if (andConditions.length) where.$and = andConditions;
    const [logs, total] = await this.em.findAndCount(AuditLogOrmEntity, where, {
      orderBy: { createdAt: 'DESC' },
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });
    const userIds = [...new Set(logs.flatMap((log) => [log.actorId, log.targetUserId]).filter(Boolean))] as string[];
    const users = await this.em.find(UserOrmEntity, { id: { $in: userIds } });
    const userMap = new Map(users.map((user) => [user.id, user]));
    const summary = (id: string | null) => {
      if (!id) return null;
      const user = userMap.get(id);
      return user ? { id: user.id, name: user.name ?? user.githubLogin, email: user.githubLogin } : null;
    };
    return {
      logs: logs.map(
        (log) =>
          ({
            id: log.id,
            createdAt: log.createdAt,
            action: log.action,
            resourceType: log.resourceType,
            resourceId: log.resourceId,
            actorRole: log.actorId ? (userMap.get(log.actorId)?.role ?? null) : null,
            actor: summary(log.actorId),
            target: summary(log.targetUserId),
            reason: log.reason,
            hasBefore: Boolean(log.beforeJson),
            hasAfter: Boolean(log.afterJson),
          }) as AuditLogListItem,
      ),
      total,
    };
  }

  async findExport(id: string, scope?: AuditQueryScope): Promise<AuditLogExport | null> {
    const where: FilterQuery<AuditLogOrmEntity> = { id };
    if (scope && scope !== 'all') {
      if ('organizationId' in scope) where.organizationId = scope.organizationId;
      if ('userId' in scope) where.$and = [{ $or: [{ actorId: scope.userId }, { targetUserId: scope.userId }] }];
    }
    const log = await this.em.findOne(AuditLogOrmEntity, where);
    if (!log) return null;
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
      createdAt: log.createdAt,
    };
  }
}
