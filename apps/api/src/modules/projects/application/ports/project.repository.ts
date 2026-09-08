import type { ProjectRecord } from '../../domain/project.js';

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');

export interface ProjectRepository {
  findByOwnerId(ownerId: string): Promise<ProjectRecord[]>;
  findByOwnerAndId(ownerId: string, id: string): Promise<ProjectRecord | null>;
  save(project: ProjectRecord): Promise<void>;
}
