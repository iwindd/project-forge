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
export class ArchiveProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository,
    private readonly organizations: OrganizationService,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  execute(
    actorId: string,
    organizationId: string,
    id: string,
    options: { requestId?: string; reason?: string } = {},
  ) {
    return this.unitOfWork.run(async () => {
      await this.organizations.requireProjectManager(actorId, organizationId);
      const now = new Date();
      // Atomic conditional transition: only the request whose write actually moved the row from
      // ACTIVE to ARCHIVED gets `applied: true`. A request that lost the race (double click, second
      // tab, client retry) reads the ARCHIVED record and returns it without writing an audit event,
      // so a repeated archive cannot produce a duplicate PROJECT_ARCHIVED row.
      const transition = await this.projects.transitionStatus({
        organizationId,
        id,
        from: ProjectStatus.ACTIVE,
        to: ProjectStatus.ARCHIVED,
        archivedAt: now,
        updatedAt: now,
      });
      if (!transition) throw new NotFoundError('Project was not found');
      if (!transition.applied) return transition.project;

      await this.audit.record({
        actorId,
        organizationId,
        action: 'PROJECT_ARCHIVED',
        resourceType: 'PROJECT',
        resourceId: transition.project.id,
        before: { status: ProjectStatus.ACTIVE },
        after: { status: ProjectStatus.ARCHIVED },
        requestId: options.requestId,
        ...(options.reason ? { reason: options.reason } : {}),
      });
      return transition.project;
    });
  }
}
