import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOGGER } from '../../../../common/audit/audit.port.js';
import type { AuditLogPort } from '../../../../common/audit/audit.port.js';
import { UNIT_OF_WORK } from '../../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../../common/database/unit-of-work.port.js';
import { ForbiddenError, NotFoundError } from '../../../../common/errors/application-error.js';
import { AccessStatus, type UserRecord, UserRole } from '../../domain/user.js';
import { USER_REPOSITORY } from '../ports/user.repository.js';
import type { UserRepository } from '../ports/user.repository.js';

export type ChangeUserRoleInput = {
  role: UserRole;
  reason?: string;
};

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
