import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import type { ProjectMemberRepository } from '../../application/ports/project-member.repository.js';
import type { ProjectMemberRecord } from '../../domain/project.js';
import { ProjectMemberOrmEntity } from './project-member.orm-entity.js';

@Injectable()
export class MikroOrmProjectMemberRepository implements ProjectMemberRepository {
  constructor(private readonly em: EntityManager) {}

  async create(member: ProjectMemberRecord): Promise<void> {
    const entity = this.em.create(ProjectMemberOrmEntity, {
      id: member.id,
      projectId: member.projectId,
      userId: member.userId,
      role: member.role,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    });
    this.em.persist(entity);
  }
}
