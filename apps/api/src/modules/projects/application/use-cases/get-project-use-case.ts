import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors/application-error.js';
import { PROJECT_REPOSITORY } from '../ports/project.repository.js';
import type { ProjectRepository } from '../ports/project.repository.js';

@Injectable()
export class GetProjectUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository) {}

  async execute(ownerId: string, id: string) {
    const project = await this.projects.findByOwnerAndId(ownerId, id);
    if (!project) throw new NotFoundError('Project was not found');
    return project;
  }
}
