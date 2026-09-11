export const AUDIT_QUERY = Symbol('AUDIT_QUERY');

export type AuditQuery = {
  page: number;
  limit: number;
  actions?: string;
  resourceTypes?: string;
  from?: string;
  to?: string;
  search?: string;
};

export type AuditQueryScope =
  | 'all'
  | { userId: string }
  | { organizationId: string }
  | { organizationId: string; userId: string };

export type AuditLogListItem = {
  id: string;
  createdAt: Date;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actorRole: 'ADMIN' | 'USER' | null;
  actor: { id: string; name: string; email: string } | null;
  target: { id: string; name: string; email: string } | null;
  reason: string | null;
  hasBefore: boolean;
  hasAfter: boolean;
};

export type AuditLogExport = {
  id: string;
  organizationId: string | null;
  actorId: string | null;
  targetUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  reason: string | null;
  requestId: string | null;
  createdAt: Date;
};

export interface AuditQueryPort {
  list(
    query: AuditQuery,
    scope: AuditQueryScope,
  ): Promise<{
    logs: AuditLogListItem[];
    total: number;
  }>;
  findExport(id: string, scope?: AuditQueryScope): Promise<AuditLogExport | null>;
}
