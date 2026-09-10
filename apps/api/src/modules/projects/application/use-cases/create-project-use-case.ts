import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOGGER } from '../../../../common/audit/audit.port.js';
import type { AuditLogPort } from '../../../../common/audit/audit.port.js';
import { UNIT_OF_WORK } from '../../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../../common/database/unit-of-work.port.js';
import {
  ConflictError,
  InvalidInputError,
} from '../../../../common/errors/application-error.js';
import { OrganizationService } from '../../../organizations/application/organization.service.js';
import {
  createProject,
  maskEnvironmentMetadata,
  parseGithubRepositoryUrl,
} from '../../domain/project.js';
import type { CreateProjectDto } from '../../presentation/dto/project.schemas.js';
import {
  DUPLICATE_REPOSITORY_CONFLICT_MESSAGE,
  throwDuplicateRepositoryConflict,
} from '../duplicate-repository-conflict.js';
import { PROJECT_REPOSITORY } from '../ports/project.repository.js';
import type { ProjectRepository } from '../ports/project.repository.js';

@Injectable()
export class CreateProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository,
    private readonly organizations: OrganizationService,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(
    actorId: string,
    organizationId: string,
    input: CreateProjectDto,
    options: { requestId?: string } = {},
  ) {
    return this.unitOfWork.run(async () => {
      await this.organizations.requireProjectManager(actorId, organizationId);
      const repository = parseGithubRepositoryUrl(input.githubUrl);
      if (!repository) {
        throw new InvalidInputError('Only GitHub HTTPS repository URLs are supported');
      }
      const existing = await this.projects.findByOrganizationAndGithubUrl(
        organizationId,
        repository.url,
      );
      if (existing) {
        throw new ConflictError(DUPLICATE_REPOSITORY_CONFLICT_MESSAGE);
      }
      const project = createProject({
        organizationId,
        name: input.name || repository.name,
        githubUrl: repository.url,
        githubOwner: repository.owner,
        githubRepo: repository.name,
        sourceBranch: input.sourceBranch,
        targetBranch: input.targetBranch,
        nodeVersion: input.nodeVersion || null,
        environmentMetadata: Object.keys(input.environmentMetadata).length
          ? maskEnvironmentMetadata(input.environmentMetadata)
          : null,
      });

      try {
        await this.projects.save(project);
      } catch (error) {
        throwDuplicateRepositoryConflict(error);
      }
      await this.audit.record({
        actorId,
        organizationId,
        action: 'PROJECT_CREATED',
        resourceType: 'PROJECT',
        resourceId: project.id,
        after: { name: project.name, githubUrl: project.githubUrl },
        requestId: options.requestId,
      });
      return project;
    });
  }
}
