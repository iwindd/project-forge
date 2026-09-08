import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOGGER } from '../../../../common/audit/audit.port.js';
import type { AuditLogPort } from '../../../../common/audit/audit.port.js';
import { UNIT_OF_WORK } from '../../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../../common/database/unit-of-work.port.js';
import { NotFoundError, InvalidInputError } from '../../../../common/errors/application-error.js';
import {
  createOwnerMember,
  createProject,
  maskEnvironmentMetadata,
  parseGithubRepositoryUrl,
  ProjectStatus,
} from '../../domain/project.js';
import { PROJECT_MEMBER_REPOSITORY } from '../ports/project-member.repository.js';
import type { ProjectMemberRepository } from '../ports/project-member.repository.js';
import { PROJECT_REPOSITORY } from '../ports/project.repository.js';
import type { ProjectRepository } from '../ports/project.repository.js';
import type { CreateProjectDto, UpdateProjectDto } from '../../presentation/dto/project.schemas.js';

@Injectable()
export class ListProjectsUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository) {}

  execute(ownerId: string) {
    return this.projects.findByOwnerId(ownerId);
  }
}

@Injectable()
export class GetProjectUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository) {}

  async execute(ownerId: string, id: string) {
    const project = await this.projects.findByOwnerAndId(ownerId, id);
    if (!project) throw new NotFoundError('Project was not found');
    return project;
  }
}

@Injectable()
export class CreateProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository,
    @Inject(PROJECT_MEMBER_REPOSITORY) private readonly members: ProjectMemberRepository,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(ownerId: string, input: CreateProjectDto) {
    const repository = parseGithubRepositoryUrl(input.githubUrl);
    if (!repository) throw new InvalidInputError('Only GitHub HTTPS repository URLs are supported');
    const project = createProject({
      ownerId,
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

    await this.unitOfWork.run(async () => {
      await this.projects.save(project);
      await this.members.create(createOwnerMember(project.id, ownerId));
      await this.audit.record({
        actorId: ownerId,
        targetUserId: ownerId,
        action: 'PROJECT_CREATED',
        resourceType: 'PROJECT',
        resourceId: project.id,
        after: { name: project.name, githubUrl: project.githubUrl },
      });
    });
    return project;
  }
}

@Injectable()
export class UpdateProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  execute(ownerId: string, id: string, input: UpdateProjectDto) {
    return this.unitOfWork.run(async () => {
      const project = await this.projects.findByOwnerAndId(ownerId, id);
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
        actorId: ownerId,
        targetUserId: ownerId,
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
