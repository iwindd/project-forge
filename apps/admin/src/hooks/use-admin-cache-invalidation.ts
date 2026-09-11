'use client'

import { useAppDispatch } from '@/hooks'
import { api } from '@/lib/api/api'
import { useCallback } from 'react'

type AdminCacheResource = 'users'
type AdminCacheInvalidationOptions = {
  resources?: readonly AdminCacheResource[]
  auditLogs?: boolean
  notifications?: boolean
}

export function useAdminCacheInvalidation() {
  const dispatch = useAppDispatch()
  const invalidateAdminCaches = useCallback(
    ({
      resources = [],
      auditLogs = true
    }: AdminCacheInvalidationOptions = {}) => {
      for (const resource of new Set(resources)) {
        if (resource === 'users')
          dispatch(api.util.invalidateTags([{ type: 'Users' }]))
      }
      if (auditLogs) dispatch(api.util.invalidateTags([{ type: 'AuditLogs' }]))
    },
    [dispatch]
  )

  const resetAllAdminApiCaches = useCallback(() => {
    dispatch(api.util.resetApiState())
  }, [dispatch])

  return { invalidateAdminCaches, resetAllAdminApiCaches }
}
