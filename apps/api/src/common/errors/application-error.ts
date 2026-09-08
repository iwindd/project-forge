export type ApplicationErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'UNAUTHENTICATED'
  | 'CONFIGURATION_ERROR'
  | 'EXTERNAL_SERVICE_ERROR';

export class ApplicationError extends Error {
  constructor(
    readonly code: ApplicationErrorCode,
    message: string,
    readonly status: number,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class InvalidInputError extends ApplicationError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('INVALID_INPUT', message, 400, details);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('NOT_FOUND', message, 404, details);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('CONFLICT', message, 409, details);
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('FORBIDDEN', message, 403, details);
  }
}

export class ConfigurationError extends ApplicationError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('CONFIGURATION_ERROR', message, 500, details);
  }
}

export class ExternalServiceError extends ApplicationError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('EXTERNAL_SERVICE_ERROR', message, 502, details);
  }
}
