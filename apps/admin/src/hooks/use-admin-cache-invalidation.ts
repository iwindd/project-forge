'use client';

import { useAppDispatch } from '@/hooks';
import { api } from '@/lib/api/api';
import { getAuditLogsTag, type AuditLogScopeArg } from '@/lib/features/audit-log/audit-logs-api';
import { useCallback } from 'react';

export type AdminCacheInvalidationOptions = {
  organizationId?: string | null;
  auditLogs?: boolean;
  auditLogScope?: AuditLogScopeArg;
  notifications?: boolean;
};

export function getAdminCacheInvalidationTags({
  organizationId,
  auditLogs = true,
  auditLogScope = { kind: 'all' },
}: AdminCacheInvalidationOptions = {}) {
  const tags: Array<ReturnType<typeof getAuditLogsTag>> = [];
  if (auditLogs) {
    tags.push(getAuditLogsTag(auditLogScope, organizationId ?? undefined));
  }

  return tags;
}

export function useAdminCacheInvalidation() {
  const dispatch = useAppDispatch();
  const invalidateAdminCaches = useCallback(
    (options: AdminCacheInvalidationOptions = {}) => {
      for (const tag of getAdminCacheInvalidationTags(options)) {
        dispatch(api.util.invalidateTags([tag]));
      }
    },
    [dispatch],
  );

  const resetAllAdminApiCaches = useCallback(() => {
    dispatch(api.util.resetApiState());
  }, [dispatch]);

  return { invalidateAdminCaches, resetAllAdminApiCaches };
}
