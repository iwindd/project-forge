import type { ProjectRecord } from '../../domain/project.js';

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');

export interface ProjectRepository {
  findByOrganizationId(organizationId: string): Promise<ProjectRecord[]>;
  findByOrganizationAndId(
    organizationId: string,
    id: string,
  ): Promise<ProjectRecord | null>;
  findByOrganizationAndGithubUrl(
    organizationId: string,
    githubUrl: string,
  ): Promise<ProjectRecord | null>;
  save(project: ProjectRecord): Promise<void>;
}
