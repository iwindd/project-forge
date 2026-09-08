export const AUDIT_LOGGER = Symbol('AUDIT_LOGGER');

export type AuditLogInput = {
  actorId?: string | null;
  targetUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  requestId?: string;
};

export interface AuditLogPort {
  record(input: AuditLogInput): Promise<void>;
}
