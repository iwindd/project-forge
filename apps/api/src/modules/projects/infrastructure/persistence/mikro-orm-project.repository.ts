import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { ConflictError } from '../../../../common/errors/application-error.js';
import { DUPLICATE_REPOSITORY_CONFLICT_MESSAGE } from '../../application/ports/project.repository.js';
import type {
  ProjectRepository,
  ProjectStatusTransition,
  ProjectStatusTransitionResult,
} from '../../application/ports/project.repository.js';
import type { ProjectRecord } from '../../domain/project.js';
import { ProjectOrmEntity } from './project.orm-entity.js';

@Injectable()
export class MikroOrmProjectRepository implements ProjectRepository {
  constructor(private readonly em: EntityManager) {}

  async findByOrganizationId(organizationId: string): Promise<ProjectRecord[]> {
    const projects = await this.em.find(ProjectOrmEntity, { organizationId }, { orderBy: { updatedAt: 'desc' } });
    return projects.map(toRecord);
  }

  async findByOrganizationAndId(organizationId: string, id: string): Promise<ProjectRecord | null> {
    const project = await this.em.findOne(ProjectOrmEntity, { organizationId, id });
    return project ? toRecord(project) : null;
  }

  async findByOrganizationAndGithubUrl(
    organizationId: string,
    githubUrl: string,
  ): Promise<ProjectRecord | null> {
    const project = await this.em.findOne(ProjectOrmEntity, { organizationId, githubUrl });
    return project ? toRecord(project) : null;
  }

  /**
   * Conditional write: the status predicate is part of the UPDATE, so the transition is atomic and
   * exactly one of two concurrent requests can observe `affected === 1`. The follow-up read uses
   * `refresh` so it returns the row as stored rather than any identity-map copy loaded earlier.
   */
  async transitionStatus(
    transition: ProjectStatusTransition,
  ): Promise<ProjectStatusTransitionResult | null> {
    const affected = await this.em.nativeUpdate(
      ProjectOrmEntity,
      {
        organizationId: transition.organizationId,
        id: transition.id,
        status: transition.from,
      },
      {
        status: transition.to,
        archivedAt: transition.archivedAt,
        updatedAt: transition.updatedAt,
      },
    );
    const entity = await this.em.findOne(
      ProjectOrmEntity,
      { organizationId: transition.organizationId, id: transition.id },
      { refresh: true },
    );
    if (!entity) return null;
    return { applied: affected > 0, project: toRecord(entity) };
  }

  /**
   * Persist then flush. The flush is explicit because the duplicate-repository guarantee lives in
   * the `(organization_id, github_url)` unique constraint: the violation is raised by the driver at
   * flush time, not by `persist`, so translating it here is the only place the real failure path can
   * be observed. `ConflictError` is the port contract documented on `ProjectRepository.save`.
   */
  async save(project: ProjectRecord): Promise<void> {
    const entity = await this.em.findOne(ProjectOrmEntity, { id: project.id });
    try {
      if (!entity) {
        this.em.persist(
          this.em.create(ProjectOrmEntity, {
            id: project.id,
            organizationId: project.organizationId,
            name: project.name,
            githubUrl: project.githubUrl,
            githubOwner: project.githubOwner,
            githubRepo: project.githubRepo,
            sourceBranch: project.sourceBranch,
            targetBranch: project.targetBranch,
            nodeVersion: project.nodeVersion,
            environmentMetadata: project.environmentMetadata,
            status: project.status,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            archivedAt: project.archivedAt,
          }),
        );
      } else {
        entity.organizationId = project.organizationId;
        entity.name = project.name;
        entity.githubUrl = project.githubUrl;
        entity.githubOwner = project.githubOwner;
        entity.githubRepo = project.githubRepo;
        entity.sourceBranch = project.sourceBranch;
        entity.targetBranch = project.targetBranch;
        entity.nodeVersion = project.nodeVersion;
        entity.environmentMetadata = project.environmentMetadata;
        entity.status = project.status;
        entity.createdAt = project.createdAt;
        entity.updatedAt = project.updatedAt;
        entity.archivedAt = project.archivedAt;
        this.em.persist(entity);
      }
      await this.em.flush();
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        throw new ConflictError(DUPLICATE_REPOSITORY_CONFLICT_MESSAGE);
      }
      throw error;
    }
  }
}

function toRecord(project: ProjectOrmEntity): ProjectRecord {
  return {
    id: project.id,
    organizationId: project.organizationId,
    name: project.name,
    githubUrl: project.githubUrl,
    githubOwner: project.githubOwner,
    githubRepo: project.githubRepo,
    sourceBranch: project.sourceBranch,
    targetBranch: project.targetBranch,
    nodeVersion: project.nodeVersion,
    environmentMetadata: project.environmentMetadata,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    archivedAt: project.archivedAt,
  };
}
