import { EntityManager, type FilterQuery } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import type { UserListQuery, UserRepository } from '../../application/ports/user.repository.js';
import { AccessStatus, type UserRecord, UserRole } from '../../domain/user.js';
import { UserOrmEntity } from './user.orm-entity.js';

@Injectable()
export class MikroOrmUserRepository implements UserRepository {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<UserRecord | null> {
    const user = await this.em.findOne(UserOrmEntity, { id });
    return user ? toUserRecord(user) : null;
  }

  async findByGithubUserId(githubUserId: string): Promise<UserRecord | null> {
    const user = await this.em.findOne(UserOrmEntity, { githubUserId });
    return user ? toUserRecord(user) : null;
  }

  async list(query: UserListQuery): Promise<{ data: UserRecord[]; total: number }> {
    const where: FilterQuery<UserOrmEntity> = {};
    if (query.status) where.accessStatus = query.status;
    if (query.search?.trim()) where.githubLogin = { $ilike: `%${query.search.trim()}%` };
    const [users, total] = await Promise.all([
      this.em.find(UserOrmEntity, where, {
        orderBy: { createdAt: 'desc' },
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
      }),
      this.em.count(UserOrmEntity, where),
    ]);
    return { data: users.map(toUserRecord), total };
  }

  countActiveAdminsExcluding(userId: string): Promise<number> {
    return this.em.count(UserOrmEntity, {
      role: UserRole.ADMIN,
      accessStatus: AccessStatus.APPROVED,
      isActive: true,
      id: { $ne: userId },
    });
  }

  async save(user: UserRecord): Promise<void> {
    const entity = await this.em.findOne(UserOrmEntity, { id: user.id });
    if (!entity) {
      this.em.persist(
        this.em.create(UserOrmEntity, {
          id: user.id,
          githubUserId: user.githubUserId,
          githubLogin: user.githubLogin,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
          accessStatus: user.accessStatus,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }),
      );
      return;
    }
    entity.githubUserId = user.githubUserId;
    entity.githubLogin = user.githubLogin;
    entity.name = user.name;
    entity.avatarUrl = user.avatarUrl;
    entity.role = user.role;
    entity.accessStatus = user.accessStatus;
    entity.isActive = user.isActive;
    entity.createdAt = user.createdAt;
    entity.updatedAt = user.updatedAt;
    this.em.persist(entity);
  }
}

function toUserRecord(user: UserOrmEntity): UserRecord {
  return {
    id: user.id,
    githubUserId: user.githubUserId,
    githubLogin: user.githubLogin,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    accessStatus: user.accessStatus,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
