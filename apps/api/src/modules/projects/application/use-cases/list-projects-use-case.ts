import { Inject, Injectable } from '@nestjs/common';
import { PROJECT_REPOSITORY } from '../ports/project.repository.js';
import type { ProjectRepository } from '../ports/project.repository.js';

@Injectable()
export class ListProjectsUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository) {}

  execute(ownerId: string) {
    return this.projects.findByOwnerId(ownerId);
  }
}
