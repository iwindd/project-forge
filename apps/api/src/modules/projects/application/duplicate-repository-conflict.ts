import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { ConflictError } from '../../../common/errors/application-error.js';

export const DUPLICATE_REPOSITORY_CONFLICT_MESSAGE =
  'A project with this repository already exists in the organization';

/**
 * The duplicate lookup is check-then-insert, so two concurrent writes for the same repository can
 * both pass it. The database unique constraint on (organization_id, github_url) is the last line of
 * defence, and its driver error is neither an ApplicationError nor a ZodError nor an HttpException,
 * so it would surface as a 500. Translate it into the same typed conflict the sequential check
 * throws so a duplicate repository always yields 409/CONFLICT.
 */
export function throwDuplicateRepositoryConflict(error: unknown): never {
  if (error instanceof UniqueConstraintViolationException) {
    throw new ConflictError(DUPLICATE_REPOSITORY_CONFLICT_MESSAGE);
  }
  throw error;
}
