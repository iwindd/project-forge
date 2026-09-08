import type { infer as ZodInfer } from "zod";
import type { listAuditLogsSchema } from "./queries/get-audit-log-list-schema";

export type AuditLogListQuery = ZodInfer<typeof listAuditLogsSchema>;

export type AuditLogUserSummary = {
  id: string;
  name: string;
  email: string;
};

export type AuditLogListItem = {
  id: string;
  createdAt: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actorRole: "ADMIN" | "USER" | "EDITOR" | null;
  actor: AuditLogUserSummary | null;
  target: AuditLogUserSummary | null;
  reason: string | null;
  hasBefore: boolean;
  hasAfter: boolean;
};

export type AuditLogListResult = {
  data: AuditLogListItem[];
  total: number;
};

export type AuditLogExportUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EDITOR";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type AuditLogExportRow = {
  id: string;
  actorUserId: string | null;
  actorRole: "ADMIN" | "USER" | "EDITOR" | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  targetUserId: string | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  reason: string | null;
  requestId: string | null;
  ipHash: string | null;
  userAgent: string | null;
  createdAt: string;
  actorUser: AuditLogExportUser | null;
  targetUser: AuditLogExportUser | null;
};

export type AuditLogExportFile = {
  exportedAt: string;
  auditLog: AuditLogExportRow;
};
