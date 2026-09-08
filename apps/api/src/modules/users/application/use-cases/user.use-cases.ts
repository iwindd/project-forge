import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOGGER } from '../../../../common/audit/audit.port.js';
import type { AuditLogPort } from '../../../../common/audit/audit.port.js';
import { UNIT_OF_WORK } from '../../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../../common/database/unit-of-work.port.js';
import { NotFoundError, ForbiddenError } from '../../../../common/errors/application-error.js';
import { SESSION_REPOSITORY } from '../../../auth/application/ports/session.repository.js';
import type { SessionRepository } from '../../../auth/application/ports/session.repository.js';
import { AccessStatus, type UserRecord, UserRole } from '../../domain/user.js';
import { USER_REPOSITORY } from '../ports/user.repository.js';
import type { UserListQuery, UserRepository } from '../ports/user.repository.js';

export type ChangeUserStatusInput = {
  status: AccessStatus;
  reason?: string;
};

export type ChangeUserRoleInput = {
  role: UserRole;
  reason?: string;
};

@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  execute(query: { search?: string; status?: string; page?: number; limit?: number }) {
    const limit = Math.min(Math.max(query.limit || 25, 1), 100);
    const page = Math.max(query.page || 1, 1);
    const status =
      query.status && Object.values(AccessStatus).includes(query.status as AccessStatus)
        ? (query.status as AccessStatus)
        : undefined;
    const input: UserListQuery = { search: query.search, status, page, limit };
    return this.users.list(input).then(({ data, total }) => ({ data, total, page, limit }));
  }
}

@Injectable()
export class GetUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(id: string): Promise<UserRecord> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('User was not found');
    return user;
  }
}

@Injectable()
export class ChangeUserStatusUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  execute(actorId: string, targetId: string, input: ChangeUserStatusInput): Promise<UserRecord> {
    return this.unitOfWork.run(async () => {
      const target = await this.requireUser(targetId);
      if (actorId === targetId && input.status === AccessStatus.SUSPENDED) {
        throw new ForbiddenError('You cannot suspend your own account');
      }
      if (
        target.role === UserRole.ADMIN &&
        target.accessStatus === AccessStatus.APPROVED &&
        input.status === AccessStatus.SUSPENDED &&
        (await this.users.countActiveAdminsExcluding(targetId)) === 0
      ) {
        throw new ForbiddenError('At least one active administrator must remain');
      }

      const before = { accessStatus: target.accessStatus, isActive: target.isActive };
      target.accessStatus = input.status;
      target.isActive = input.status !== AccessStatus.SUSPENDED;
      target.updatedAt = new Date();
      if (input.status === AccessStatus.SUSPENDED) await this.sessions.revokeAllForUser(target.id);
      await this.users.save(target);
      await this.audit.record({
        actorId,
        targetUserId: target.id,
        action: 'USER_STATUS_CHANGED',
        resourceType: 'USER',
        resourceId: target.id,
        before,
        after: { accessStatus: target.accessStatus, isActive: target.isActive },
        reason: input.reason,
      });
      return target;
    });
  }

  private async requireUser(id: string): Promise<UserRecord> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('User was not found');
    return user;
  }
}

@Injectable()
export class ChangeUserRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  execute(actorId: string, targetId: string, input: ChangeUserRoleInput): Promise<UserRecord> {
    return this.unitOfWork.run(async () => {
      const target = await this.users.findById(targetId);
      if (!target) throw new NotFoundError('User was not found');
      if (actorId === targetId && input.role !== UserRole.ADMIN) {
        throw new ForbiddenError('You cannot remove your own administrator access');
      }
      if (
        target.role === UserRole.ADMIN &&
        input.role === UserRole.USER &&
        target.accessStatus === AccessStatus.APPROVED &&
        (await this.users.countActiveAdminsExcluding(targetId)) === 0
      ) {
        throw new ForbiddenError('At least one active administrator must remain');
      }

      const before = { role: target.role };
      target.role = input.role;
      target.updatedAt = new Date();
      await this.users.save(target);
      await this.audit.record({
        actorId,
        targetUserId: target.id,
        action: 'USER_ROLE_CHANGED',
        resourceType: 'USER',
        resourceId: target.id,
        before,
        after: { role: target.role },
        reason: input.reason,
      });
      return target;
    });
  }
}

@Injectable()
export class RevokeUserSessionsUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  execute(actorId: string, targetId: string): Promise<{ ok: true }> {
    return this.unitOfWork.run(async () => {
      const target = await this.users.findById(targetId);
      if (!target) throw new NotFoundError('User was not found');
      await this.sessions.revokeAllForUser(target.id);
      await this.audit.record({
        actorId,
        targetUserId: target.id,
        action: 'USER_SESSIONS_REVOKED',
        resourceType: 'USER',
        resourceId: target.id,
      });
      return { ok: true };
    });
  }
}
