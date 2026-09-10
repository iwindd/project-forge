import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors/application-error.js';
import { OrganizationService } from '../../../organizations/application/organization.service.js';
import { PROJECT_REPOSITORY } from '../ports/project.repository.js';
import type { ProjectRepository } from '../ports/project.repository.js';

@Injectable()
export class GetProjectUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository,
    private readonly organizations: OrganizationService,
  ) {}

  async execute(userId: string, organizationId: string, id: string) {
    await this.organizations.requireProjectAccess(userId, organizationId);
    const project = await this.projects.findByOrganizationAndId(organizationId, id);
    if (!project) throw new NotFoundError('Project was not found');
    return project;
  }
}
