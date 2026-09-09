import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOGGER } from '../../../../common/audit/audit.port.js';
import type { AuditLogPort } from '../../../../common/audit/audit.port.js';
import { UNIT_OF_WORK } from '../../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../../common/database/unit-of-work.port.js';
import { NotFoundError } from '../../../../common/errors/application-error.js';
import { USER_REPOSITORY } from '../../../users/application/ports/user.repository.js';
import type { UserRepository } from '../../../users/application/ports/user.repository.js';
import { AccessStatus } from '../../../users/domain/user.js';
import { AccessRequestStatus } from '../../domain/access-request.js';
import { ACCESS_REQUEST_REPOSITORY } from '../ports/access-request.repository.js';
import type { AccessRequestRepository } from '../ports/access-request.repository.js';

@Injectable()
export class ReviewAccessRequestUseCase {
  constructor(
    @Inject(ACCESS_REQUEST_REPOSITORY) private readonly requests: AccessRequestRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  execute(actorId: string, requestId: string, decision: 'approve' | 'reject', note?: string) {
    return this.unitOfWork.run(async () => {
      const request = await this.requests.findById(requestId);
      if (!request) throw new NotFoundError('Access request was not found');
      const user = await this.users.findById(request.userId);
      if (!user) throw new NotFoundError('User was not found');

      const before = { accessStatus: user.accessStatus, requestStatus: request.status };
      const approved = decision === 'approve';
      user.accessStatus = approved ? AccessStatus.APPROVED : AccessStatus.REJECTED;
      if (approved) user.isActive = true;
      user.updatedAt = new Date();
      request.status = approved ? AccessRequestStatus.APPROVED : AccessRequestStatus.REJECTED;
      request.reviewedBy = actorId;
      request.reviewedAt = new Date();
      request.reviewNote = note?.trim() || null;
      request.updatedAt = new Date();

      await this.users.save(user);
      await this.requests.save(request);
      await this.audit.record({
        actorId,
        targetUserId: user.id,
        action: approved ? 'ACCESS_APPROVED' : 'ACCESS_REJECTED',
        resourceType: 'ACCESS_REQUEST',
        resourceId: request.id,
        before,
        after: { accessStatus: user.accessStatus, requestStatus: request.status },
        reason: note,
      });
      return { request, user };
    });
  }
}
