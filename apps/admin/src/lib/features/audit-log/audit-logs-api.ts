import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  AuditLogListQuery,
  AuditLogListResult,
} from "@/servers/audit-log/types";
import { addOrganizationHeader, getActiveOrganizationId } from "../organization/organization-context";

/** Which timeline to read. The server re-derives every scope it can. */
export type AuditLogScopeArg =
  | { kind: "all" }
  | { kind: "user"; userId: string }
  | { kind: "own" };

function getAuditLogListUrl(scope: AuditLogScopeArg) {
  const organizationId = getActiveOrganizationId();
  if (organizationId && scope.kind === "user") {
    return `audit-logs/organization/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(scope.userId)}`;
  }
  if (organizationId && scope.kind === "all") {
    return `audit-logs/organization/${encodeURIComponent(organizationId)}`;
  }
  if (scope.kind === "user") {
    return `audit-logs/users/${encodeURIComponent(scope.userId)}`;
  }

  return scope.kind === "own" ? "audit-logs/me" : "audit-logs";
}

export function getAuditLogExportUrl(scope: AuditLogScopeArg, id: string) {
  const organizationId = getActiveOrganizationId();
  const base = scope.kind === "own"
    ? "audit-logs/me"
    : organizationId
      ? `audit-logs/organization/${encodeURIComponent(organizationId)}`
      : "audit-logs";

  return `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5050"}/api/v1/${base}/${encodeURIComponent(id)}/export`;
}

/** Multi-value filters travel as comma-separated lists. */
function toRequestParams(query: AuditLogListQuery) {
  const { actions, resourceTypes, ...rest } = query;

  return {
    ...rest,
    ...(actions?.length ? { actions: actions.join(",") } : {}),
    ...(resourceTypes?.length
      ? { resourceTypes: resourceTypes.join(",") }
      : {}),
  };
}

export const auditLogsApi = createApi({
  reducerPath: "auditLogsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5050"}/api/v1/`,
    credentials: "include",
    cache: "no-store",
    prepareHeaders: (headers) => addOrganizationHeader(headers),
  }),
  tagTypes: ["AuditLogs"],
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getAuditLogs: builder.query<
      AuditLogListResult,
      { scope: AuditLogScopeArg; query: AuditLogListQuery }
    >({
      query: ({ scope, query }) => ({
        url: getAuditLogListUrl(scope),
        params: toRequestParams(query),
      }),
      providesTags: ["AuditLogs"],
    }),
  }),
});

export const { useGetAuditLogsQuery } = auditLogsApi;
