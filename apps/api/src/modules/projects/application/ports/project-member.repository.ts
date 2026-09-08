import type { ProjectMemberRecord } from '../../domain/project.js';

export const PROJECT_MEMBER_REPOSITORY = Symbol('PROJECT_MEMBER_REPOSITORY');

export interface ProjectMemberRepository {
  create(member: ProjectMemberRecord): Promise<void>;
}
