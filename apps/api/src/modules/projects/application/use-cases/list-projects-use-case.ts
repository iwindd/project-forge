import { Inject, Injectable } from '@nestjs/common';
import { OrganizationService } from '../../../organizations/application/organization.service.js';
import { PROJECT_REPOSITORY } from '../ports/project.repository.js';
import type { ProjectRepository } from '../ports/project.repository.js';

@Injectable()
export class ListProjectsUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository,
    private readonly organizations: OrganizationService,
  ) {}

  async execute(userId: string, organizationId: string) {
    await this.organizations.requireProjectAccess(userId, organizationId);
    return this.projects.findByOrganizationId(organizationId);
  }
}
