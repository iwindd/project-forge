'use client'

import { useAppDispatch } from '@/hooks'
import { api } from '@/lib/api/api'
import {
  getAuditLogsTag,
  type AuditLogScopeArg
} from '@/lib/features/audit-log/audit-logs-api'
import { getUsersTag } from '@/lib/features/user/users-api'
import { useCallback } from 'react'

type AdminCacheResource = 'users'
export type AdminCacheInvalidationOptions = {
  resources?: readonly AdminCacheResource[]
  organizationId?: string | null
  auditLogs?: boolean
  auditLogScope?: AuditLogScopeArg
  notifications?: boolean
}

export function getAdminCacheInvalidationTags({
  resources = [],
  organizationId,
  auditLogs = true,
  auditLogScope = { kind: 'all' }
}: AdminCacheInvalidationOptions = {}) {
  const tags: Array<
    ReturnType<typeof getUsersTag> | ReturnType<typeof getAuditLogsTag>
  > = []

  for (const resource of new Set(resources)) {
    if (resource === 'users') tags.push(getUsersTag(organizationId ?? undefined))
  }
  if (auditLogs) {
    tags.push(getAuditLogsTag(auditLogScope, organizationId ?? undefined))
  }

  return tags
}

export function useAdminCacheInvalidation() {
  const dispatch = useAppDispatch()
  const invalidateAdminCaches = useCallback(
    (options: AdminCacheInvalidationOptions = {}) => {
      for (const tag of getAdminCacheInvalidationTags(options)) {
        dispatch(api.util.invalidateTags([tag]))
      }
    },
    [dispatch]
  )

  const resetAllAdminApiCaches = useCallback(() => {
    dispatch(api.util.resetApiState())
  }, [dispatch])

  return { invalidateAdminCaches, resetAllAdminApiCaches }
}
