import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOGGER } from '../../../../common/audit/audit.port.js';
import type { AuditLogPort } from '../../../../common/audit/audit.port.js';
import { UNIT_OF_WORK } from '../../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../../common/database/unit-of-work.port.js';
import { InvalidInputError } from '../../../../common/errors/application-error.js';
import {
  createOwnerMember,
  createProject,
  maskEnvironmentMetadata,
  parseGithubRepositoryUrl,
} from '../../domain/project.js';
import type { CreateProjectDto } from '../../presentation/dto/project.schemas.js';
import { PROJECT_MEMBER_REPOSITORY } from '../ports/project-member.repository.js';
import type { ProjectMemberRepository } from '../ports/project-member.repository.js';
import { PROJECT_REPOSITORY } from '../ports/project.repository.js';
import type { ProjectRepository } from '../ports/project.repository.js';

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
