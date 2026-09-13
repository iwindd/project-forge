import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOGGER } from '../../../../common/audit/audit.port.js';
import type { AuditLogPort } from '../../../../common/audit/audit.port.js';
import { UNIT_OF_WORK } from '../../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../../common/database/unit-of-work.port.js';
import { NotFoundError } from '../../../../common/errors/application-error.js';
import { OrganizationService } from '../../../organizations/application/organization.service.js';
import { ProjectStatus } from '../../domain/project.js';
import { PROJECT_REPOSITORY } from '../ports/project.repository.js';
import type { ProjectRepository } from '../ports/project.repository.js';

@Injectable()
export class RestoreProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository,
    private readonly organizations: OrganizationService,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  execute(actorId: string, organizationId: string, id: string, options: { requestId?: string; reason?: string } = {}) {
    return this.unitOfWork.run(async () => {
      await this.organizations.requireProjectManager(actorId, organizationId);
      const now = new Date();
      // Mirror image of archive: the conditional write clears `archivedAt` only for the request
      // that actually moved the row from ARCHIVED to ACTIVE, and only that request audits, so a
      // repeated restore cannot produce a duplicate PROJECT_RESTORED row.
      const transition = await this.projects.transitionStatus({
        organizationId,
        id,
        from: ProjectStatus.ARCHIVED,
        to: ProjectStatus.ACTIVE,
        archivedAt: null,
        updatedAt: now,
      });
      if (!transition) throw new NotFoundError('Project was not found');
      if (!transition.applied) return transition.project;

      await this.audit.record({
        actorId,
        organizationId,
        action: 'PROJECT_RESTORED',
        resourceType: 'PROJECT',
        resourceId: transition.project.id,
        before: { status: ProjectStatus.ARCHIVED },
        after: { status: ProjectStatus.ACTIVE },
        requestId: options.requestId,
        ...(options.reason ? { reason: options.reason } : {}),
      });
      return transition.project;
    });
  }
}
