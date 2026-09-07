import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from '../auth/auth.service.js';
import { AccessStatus, User, UserRole } from './user.entity.js';

const statusSchema = z.object({
  status: z.enum([AccessStatus.APPROVED, AccessStatus.REJECTED, AccessStatus.SUSPENDED]),
  reason: z.string().trim().max(1000).optional().default(''),
});
const roleSchema = z.object({
  role: z.enum([UserRole.USER, UserRole.ADMIN]),
  reason: z.string().trim().max(1000).optional().default(''),
});

@Injectable()
export class UsersService {
  constructor(
    private readonly em: EntityManager,
    private readonly auth: AuthService,
  ) {}

  async list(query: { search?: string; status?: string; page?: number; limit?: number }) {
    const limit = Math.min(Math.max(query.limit || 25, 1), 100);
    const page = Math.max(query.page || 1, 1);
    const where: Record<string, unknown> = {};
    if (query.status && Object.values(AccessStatus).includes(query.status as AccessStatus))
      where.accessStatus = query.status;
    if (query.search?.trim()) where.githubLogin = { $ilike: `%${query.search.trim()}%` };
    const [users, total] = await Promise.all([
      this.em.find(User, where, { orderBy: { createdAt: 'desc' }, limit, offset: (page - 1) * limit }),
      this.em.count(User, where),
    ]);
    return { data: users.map((user) => this.safe(user)), total, page, limit };
  }

  async get(id: string) {
    const user = await this.em.findOne(User, { id });
    if (!user) throw new Error('User was not found');
    return this.safe(user);
  }

  async setStatus(actorId: string, targetId: string, body: unknown) {
    const input = statusSchema.parse(body);
    const target = await this.em.findOne(User, { id: targetId });
    if (!target) throw new Error('User was not found');
    if (actorId === targetId && input.status === AccessStatus.SUSPENDED)
      throw new Error('You cannot suspend your own account');
    if (
      target.role === UserRole.ADMIN &&
      target.accessStatus === AccessStatus.APPROVED &&
      input.status === AccessStatus.SUSPENDED
    ) {
      const activeAdmins = await this.em.count(User, {
        role: UserRole.ADMIN,
        accessStatus: AccessStatus.APPROVED,
        isActive: true,
        id: { $ne: targetId },
      });
      if (activeAdmins === 0) throw new Error('At least one active administrator must remain');
    }
    const before = { accessStatus: target.accessStatus, isActive: target.isActive };
    target.accessStatus = input.status;
    target.isActive = input.status !== AccessStatus.SUSPENDED;
    if (input.status === AccessStatus.SUSPENDED) await this.auth.revokeUserSessions(target.id);
    await this.auth.writeAudit({
      actorId,
      targetUserId: target.id,
      action: 'USER_STATUS_CHANGED',
      resourceType: 'USER',
      resourceId: target.id,
      before,
      after: { accessStatus: target.accessStatus, isActive: target.isActive },
      reason: input.reason,
    });
    await this.em.flush();
    return this.safe(target);
  }

  async setRole(actorId: string, targetId: string, body: unknown) {
    const input = roleSchema.parse(body);
    const target = await this.em.findOne(User, { id: targetId });
    if (!target) throw new Error('User was not found');
    if (actorId === targetId && input.role !== UserRole.ADMIN)
      throw new Error('You cannot remove your own administrator access');
    if (
      target.role === UserRole.ADMIN &&
      input.role === UserRole.USER &&
      target.accessStatus === AccessStatus.APPROVED
    ) {
      const activeAdmins = await this.em.count(User, {
        role: UserRole.ADMIN,
        accessStatus: AccessStatus.APPROVED,
        isActive: true,
        id: { $ne: targetId },
      });
      if (activeAdmins === 0) throw new Error('At least one active administrator must remain');
    }
    const before = { role: target.role };
    target.role = input.role;
    await this.auth.writeAudit({
      actorId,
      targetUserId: target.id,
      action: 'USER_ROLE_CHANGED',
      resourceType: 'USER',
      resourceId: target.id,
      before,
      after: { role: target.role },
      reason: input.reason,
    });
    await this.em.flush();
    return this.safe(target);
  }

  async revokeSessions(actorId: string, targetId: string) {
    const target = await this.em.findOne(User, { id: targetId });
    if (!target) throw new Error('User was not found');
    await this.auth.revokeUserSessions(target.id);
    await this.auth.writeAudit({
      actorId,
      targetUserId: target.id,
      action: 'USER_SESSIONS_REVOKED',
      resourceType: 'USER',
      resourceId: target.id,
    });
    await this.em.flush();
    return { ok: true };
  }

  private safe(user: User) {
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
}
