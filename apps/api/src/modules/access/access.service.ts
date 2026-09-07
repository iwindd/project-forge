import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AccessRequest, AccessRequestStatus } from './access-request.entity.js';
import { AccessStatus, User, UserRole } from '../users/user.entity.js';
import { AuthService } from '../auth/auth.service.js';

const requestSchema = z.object({ reason: z.string().trim().max(1000).optional().default('') });

@Injectable()
export class AccessService {
  constructor(private readonly em: EntityManager, private readonly auth: AuthService) {}

  async getMine(userId: string) {
    return this.em.find(AccessRequest, { userId }, { orderBy: { createdAt: 'desc' } });
  }

  async request(userId: string, body: unknown) {
    const input = requestSchema.parse(body);
    const existing = await this.em.findOne(AccessRequest, { userId, status: AccessRequestStatus.PENDING });
    if (existing) return existing;
    const row = this.em.create(AccessRequest, { userId, reason: input.reason || null });
    this.em.persist(row);
    await this.em.flush();
    return row;
  }

  async list() {
    const rows = await this.em.find(AccessRequest, {}, { orderBy: { createdAt: 'desc' } });
    const users = await this.em.findAll(User);
    const byId = new Map(users.map((user) => [user.id, user]));
    return rows.map((row) => ({ ...row, user: this.safeUser(byId.get(row.userId)) }));
  }

  async approve(actorId: string, requestId: string, note?: string) {
    const request = await this.em.findOne(AccessRequest, { id: requestId });
    if (!request) throw new Error('Access request was not found');
    const user = await this.em.findOne(User, { id: request.userId });
    if (!user) throw new Error('User was not found');
    const before = { accessStatus: user.accessStatus, requestStatus: request.status };
    user.accessStatus = AccessStatus.APPROVED;
    user.isActive = true;
    request.status = AccessRequestStatus.APPROVED;
    request.reviewedBy = actorId;
    request.reviewedAt = new Date();
    request.reviewNote = note?.trim() || null;
    await this.auth.writeAudit({ actorId, targetUserId: user.id, action: 'ACCESS_APPROVED', resourceType: 'ACCESS_REQUEST', resourceId: request.id, before, after: { accessStatus: user.accessStatus, requestStatus: request.status }, reason: note });
    await this.em.flush();
    return { request, user: this.safeUser(user) };
  }

  async reject(actorId: string, requestId: string, note?: string) {
    const request = await this.em.findOne(AccessRequest, { id: requestId });
    if (!request) throw new Error('Access request was not found');
    const user = await this.em.findOne(User, { id: request.userId });
    if (!user) throw new Error('User was not found');
    const before = { accessStatus: user.accessStatus, requestStatus: request.status };
    user.accessStatus = AccessStatus.REJECTED;
    request.status = AccessRequestStatus.REJECTED;
    request.reviewedBy = actorId;
    request.reviewedAt = new Date();
    request.reviewNote = note?.trim() || null;
    await this.auth.writeAudit({ actorId, targetUserId: user.id, action: 'ACCESS_REJECTED', resourceType: 'ACCESS_REQUEST', resourceId: request.id, before, after: { accessStatus: user.accessStatus, requestStatus: request.status }, reason: note });
    await this.em.flush();
    return { request, user: this.safeUser(user) };
  }

  private safeUser(user: User | undefined) {
    if (!user) return null;
    return { id: user.id, githubUserId: user.githubUserId, githubLogin: user.githubLogin, name: user.name, avatarUrl: user.avatarUrl, role: user.role, accessStatus: user.accessStatus, isActive: user.isActive, createdAt: user.createdAt, updatedAt: user.updatedAt };
  }
}
