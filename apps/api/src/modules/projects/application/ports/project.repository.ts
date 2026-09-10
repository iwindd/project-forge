import type { ProjectRecord } from '../../domain/project.js';

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');

/**
 * Single source for the duplicate-repository conflict message. Both the use cases' sequential
 * lookup and the persistence adapter's constraint translation must use it.
 */
export const DUPLICATE_REPOSITORY_CONFLICT_MESSAGE =
  'A project with this repository already exists in the organization';

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
  /**
   * Persist the record and flush it, so the write joins the surrounding UnitOfWork transaction
   * instead of waiting for an unrelated later flush.
   *
   * Contract: `save` flushes. Saving a Project whose normalized `githubUrl` already exists in the
   * same Organization throws `ConflictError` (code `CONFLICT`, status 409). The adapter derives that
   * from the `(organization_id, github_url)` unique constraint, because the caller's sequential
   * check-then-insert lookup cannot see a row a concurrent request is inserting at the same moment.
   * The sequential check is only a fast path that yields a friendlier message; the constraint
   * translation is what makes the duplicate-repository guarantee real, so do not remove it.
   */
  save(project: ProjectRecord): Promise<void>;
}
