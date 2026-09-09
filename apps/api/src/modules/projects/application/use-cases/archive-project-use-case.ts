import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOGGER } from '../../../../common/audit/audit.port.js';
import type { AuditLogPort } from '../../../../common/audit/audit.port.js';
import { UNIT_OF_WORK } from '../../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../../common/database/unit-of-work.port.js';
import { NotFoundError } from '../../../../common/errors/application-error.js';
import { ProjectStatus } from '../../domain/project.js';
import { PROJECT_REPOSITORY } from '../ports/project.repository.js';
import type { ProjectRepository } from '../ports/project.repository.js';

@Injectable()
export class ArchiveProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  execute(ownerId: string, id: string) {
    return this.unitOfWork.run(async () => {
      const project = await this.projects.findByOwnerAndId(ownerId, id);
      if (!project) throw new NotFoundError('Project was not found');
      project.status = ProjectStatus.ARCHIVED;
      project.archivedAt = new Date();
      project.updatedAt = new Date();
      await this.projects.save(project);
      await this.audit.record({
        actorId: ownerId,
        targetUserId: ownerId,
        action: 'PROJECT_ARCHIVED',
        resourceType: 'PROJECT',
        resourceId: project.id,
        before: { status: ProjectStatus.ACTIVE },
        after: { status: project.status },
      });
      return project;
    });
  }
}
