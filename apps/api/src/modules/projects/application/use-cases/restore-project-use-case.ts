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

  execute(
    actorId: string,
    organizationId: string,
    id: string,
    options: { requestId?: string; reason?: string } = {},
  ) {
    return this.unitOfWork.run(async () => {
      await this.organizations.requireProjectManager(actorId, organizationId);
      const project = await this.projects.findByOrganizationAndId(organizationId, id);
      if (!project) throw new NotFoundError('Project was not found');
      if (project.status === ProjectStatus.ACTIVE) return project;

      const before = { status: project.status };
      project.status = ProjectStatus.ACTIVE;
      project.archivedAt = null;
      project.updatedAt = new Date();
      await this.projects.save(project);
      await this.audit.record({
        actorId,
        organizationId,
        action: 'PROJECT_RESTORED',
        resourceType: 'PROJECT',
        resourceId: project.id,
        before,
        after: { status: project.status },
        requestId: options.requestId,
        ...(options.reason ? { reason: options.reason } : {}),
      });
      return project;
    });
  }
}
