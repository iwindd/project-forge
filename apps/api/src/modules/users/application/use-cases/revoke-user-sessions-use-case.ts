import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOGGER } from '../../../../common/audit/audit.port.js';
import type { AuditLogPort } from '../../../../common/audit/audit.port.js';
import { UNIT_OF_WORK } from '../../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../../common/database/unit-of-work.port.js';
import { NotFoundError } from '../../../../common/errors/application-error.js';
import { SESSION_REPOSITORY } from '../../../auth/application/ports/session.repository.js';
import type { SessionRepository } from '../../../auth/application/ports/session.repository.js';
import { USER_REPOSITORY } from '../ports/user.repository.js';
import type { UserRepository } from '../ports/user.repository.js';

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
