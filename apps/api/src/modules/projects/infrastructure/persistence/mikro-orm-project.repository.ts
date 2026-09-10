import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import type { ProjectRepository } from '../../application/ports/project.repository.js';
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

  async save(project: ProjectRecord): Promise<void> {
    const entity = await this.em.findOne(ProjectOrmEntity, { id: project.id });
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
      return;
    }
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
