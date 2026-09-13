import type { ProjectRecord, ProjectStatus } from '../../domain/project.js';

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');

/**
 * Single source for the duplicate-repository conflict message. Both the use cases' sequential
 * lookup and the persistence adapter's constraint translation must use it.
 */
export const DUPLICATE_REPOSITORY_CONFLICT_MESSAGE =
  'A project with this repository already exists in the organization';

/** Fields of a conditional lifecycle transition: the row moves `from -> to` only if it still is `from`. */
export type ProjectStatusTransition = {
  organizationId: string;
  id: string;
  from: ProjectStatus;
  to: ProjectStatus;
  archivedAt: Date | null;
  updatedAt: Date;
};

export type ProjectStatusTransitionResult = {
  /** True only for the caller whose write actually moved the row from `from` to `to`. */
  applied: boolean;
  /** The stored record after the attempt. */
  project: ProjectRecord;
};

export interface ProjectRepository {
  findByOrganizationId(organizationId: string): Promise<ProjectRecord[]>;
  findByOrganizationAndId(organizationId: string, id: string): Promise<ProjectRecord | null>;
  findByOrganizationAndGithubUrl(organizationId: string, githubUrl: string): Promise<ProjectRecord | null>;
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
  /**
   * Apply the `from -> to` status transition in one conditional write.
   *
   * Contract: the update matches only while the stored status still equals `from`, so of two
   * concurrent archive/restore requests that both passed their earlier guard exactly one performs
   * the transition and reports `applied: true`. Returns `null` when the Project does not exist in
   * the Organization; otherwise returns whether this call transitioned the row plus the stored
   * record after the attempt, so a losing caller can return the current Project. Callers must write
   * the audit event only when `applied` is true — that is what makes repeated archive/restore
   * idempotent server-side rather than only sequentially.
   */
  transitionStatus(transition: ProjectStatusTransition): Promise<ProjectStatusTransitionResult | null>;
}
