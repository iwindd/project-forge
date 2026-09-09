import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOGGER } from '../../../../common/audit/audit.port.js';
import type { AuditLogPort } from '../../../../common/audit/audit.port.js';
import { UNIT_OF_WORK } from '../../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../../common/database/unit-of-work.port.js';
import { NotFoundError } from '../../../../common/errors/application-error.js';
import type { UserRecord } from '../../domain/user.js';
import { USER_REPOSITORY } from '../ports/user.repository.js';
import type { UserRepository } from '../ports/user.repository.js';

export type ChangeUserNameInput = {
  name: string;
  reason?: string;
};

@Injectable()
export class ChangeUserNameUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  execute(actorId: string, targetId: string, input: ChangeUserNameInput): Promise<UserRecord> {
    return this.unitOfWork.run(async () => {
      const target = await this.users.findById(targetId);
      if (!target) throw new NotFoundError('User was not found');
      const name = input.name.trim();
      if (!name || target.name === name) return target;

      const before = { name: target.name };
      target.name = name;
      target.updatedAt = new Date();
      await this.users.save(target);
      await this.audit.record({
        actorId,
        targetUserId: target.id,
        action: actorId === targetId ? 'PROFILE_NAME_CHANGED' : 'USER_NAME_CHANGED',
        resourceType: actorId === targetId ? 'PROFILE' : 'USER',
        resourceId: target.id,
        before,
        after: { name: target.name },
        reason: input.reason,
      });
      return target;
    });
  }
}
