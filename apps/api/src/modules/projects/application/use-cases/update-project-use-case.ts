import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOGGER } from '../../../../common/audit/audit.port.js';
import type { AuditLogPort } from '../../../../common/audit/audit.port.js';
import { UNIT_OF_WORK } from '../../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../../common/database/unit-of-work.port.js';
import {
  ConflictError,
  InvalidInputError,
  NotFoundError,
} from '../../../../common/errors/application-error.js';
import { OrganizationService } from '../../../organizations/application/organization.service.js';
import {
  maskEnvironmentMetadata,
  parseGithubRepositoryUrl,
  ProjectStatus,
} from '../../domain/project.js';
import type { UpdateProjectDto } from '../../presentation/dto/project.schemas.js';
import {
  DUPLICATE_REPOSITORY_CONFLICT_MESSAGE,
  PROJECT_REPOSITORY,
} from '../ports/project.repository.js';
import type { ProjectRepository } from '../ports/project.repository.js';

@Injectable()
export class UpdateProjectUseCase {
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
    input: UpdateProjectDto,
    options: { requestId?: string } = {},
  ) {
    return this.unitOfWork.run(async () => {
      await this.organizations.requireProjectManager(actorId, organizationId);
      const project = await this.projects.findByOrganizationAndId(organizationId, id);
      if (!project) throw new NotFoundError('Project was not found');
      if (project.status !== ProjectStatus.ACTIVE) {
        throw new ConflictError('Archived projects cannot be updated');
      }
      // The repository fields define project identity and drive the duplicate rule, so a
      // repository-only PATCH must still show a visible change in the audit record.
      // `environmentMetadata` stays out of both projections: it is the field that can carry
      // secret material, and the audit log must never persist it.
      const before = {
        name: project.name,
        githubUrl: project.githubUrl,
        githubOwner: project.githubOwner,
        githubRepo: project.githubRepo,
        sourceBranch: project.sourceBranch,
        targetBranch: project.targetBranch,
        nodeVersion: project.nodeVersion,
      };

      if (input.githubUrl) {
        const repository = parseGithubRepositoryUrl(input.githubUrl);
        if (!repository) throw new InvalidInputError('Only GitHub HTTPS repository URLs are supported');
        if (repository.url !== project.githubUrl) {
          const collision = await this.projects.findByOrganizationAndGithubUrl(
            organizationId,
            repository.url,
          );
          if (collision && collision.id !== project.id) {
            throw new ConflictError(DUPLICATE_REPOSITORY_CONFLICT_MESSAGE);
          }
        }
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
      // `save` flushes, and the adapter translates the (organization_id, github_url) unique
      // constraint into ConflictError. The lookup above is only the sequential fast path: it cannot
      // see a row that a concurrent request is inserting right now.
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
          githubUrl: project.githubUrl,
          githubOwner: project.githubOwner,
          githubRepo: project.githubRepo,
          sourceBranch: project.sourceBranch,
          targetBranch: project.targetBranch,
          nodeVersion: project.nodeVersion,
        },
        requestId: options.requestId,
      });
      return project;
    });
  }
}
