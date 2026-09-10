import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOGGER } from '../../../../common/audit/audit.port.js';
import type { AuditLogPort } from '../../../../common/audit/audit.port.js';
import { UNIT_OF_WORK } from '../../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../../common/database/unit-of-work.port.js';
import { InvalidInputError, NotFoundError } from '../../../../common/errors/application-error.js';
import { OrganizationService } from '../../../organizations/application/organization.service.js';
import { maskEnvironmentMetadata, parseGithubRepositoryUrl } from '../../domain/project.js';
import type { UpdateProjectDto } from '../../presentation/dto/project.schemas.js';
import { PROJECT_REPOSITORY } from '../ports/project.repository.js';
import type { ProjectRepository } from '../ports/project.repository.js';

@Injectable()
export class UpdateProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository,
    private readonly organizations: OrganizationService,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  execute(actorId: string, organizationId: string, id: string, input: UpdateProjectDto) {
    return this.unitOfWork.run(async () => {
      await this.organizations.requireProjectManager(actorId, organizationId);
      const project = await this.projects.findByOrganizationAndId(organizationId, id);
      if (!project) throw new NotFoundError('Project was not found');
      const before = {
        name: project.name,
        sourceBranch: project.sourceBranch,
        targetBranch: project.targetBranch,
        nodeVersion: project.nodeVersion,
      };

      if (input.githubUrl) {
        const repository = parseGithubRepositoryUrl(input.githubUrl);
        if (!repository) throw new InvalidInputError('Only GitHub HTTPS repository URLs are supported');
        project.githubUrl = repository.url;
        project.githubOwner = repository.owner;
        project.githubRepo = repository.name;
      }
      if (input.name !== undefined) project.name = input.name || project.githubRepo;
      if (input.sourceBranch !== undefined) project.sourceBranch = input.sourceBranch;
      if (input.targetBranch !== undefined) project.targetBranch = input.targetBranch;
      if (input.nodeVersion !== undefined) project.nodeVersion = input.nodeVersion || null;
      if (input.environmentMetadata !== undefined) {
        project.environmentMetadata = maskEnvironmentMetadata(input.environmentMetadata);
      }
      project.updatedAt = new Date();
      await this.projects.save(project);
      await this.audit.record({
        actorId,
        organizationId,
        action: 'PROJECT_UPDATED',
        resourceType: 'PROJECT',
        resourceId: project.id,
        before,
        after: {
          name: project.name,
          sourceBranch: project.sourceBranch,
          targetBranch: project.targetBranch,
          nodeVersion: project.nodeVersion,
        },
      });
      return project;
    });
  }
}
