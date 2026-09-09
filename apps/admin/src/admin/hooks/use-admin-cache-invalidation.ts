"use client";

import { useCallback } from "react";
import { auditLogsApi } from "@/lib/features/audit-log/audit-logs-api";
import { organizationMembersApi } from "@/lib/features/organization/organization-members-api";
import { usersApi } from "@/lib/features/user/users-api";
import { useAppDispatch } from "@/admin/hooks";

type AdminCacheResource = "users";
type AdminCacheInvalidationOptions = {
  resources?: readonly AdminCacheResource[];
  auditLogs?: boolean;
  notifications?: boolean;
};

export function useAdminCacheInvalidation() {
  const dispatch = useAppDispatch();
  const invalidateAdminCaches = useCallback(({
    resources = [], auditLogs = true,
  }: AdminCacheInvalidationOptions = {}) => {
    for (const resource of new Set(resources)) {
      if (resource === "users") dispatch(usersApi.util.invalidateTags(["Users"]));
    }
    if (auditLogs) dispatch(auditLogsApi.util.invalidateTags(["AuditLogs"]));
  }, [dispatch]);

  const resetAllAdminApiCaches = useCallback(() => {
    dispatch(usersApi.util.resetApiState());
    dispatch(auditLogsApi.util.resetApiState());
    dispatch(organizationMembersApi.util.resetApiState());
  }, [dispatch]);

  return { invalidateAdminCaches, resetAllAdminApiCaches };
}
