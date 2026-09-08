'use client'

import { usePathname } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import {
  hasPermission,
  getPermissionsForUser,
  type PermissionKey,
  type PermissionMode
} from './permissions'
import { findRouteTrail } from './routes'
import type { AppDispatch, RootState } from './store'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()

const EMPTY_NOTIFICATIONS: Readonly<Record<string, number>> = {}

export function usePermissions() {
  const user = useAppSelector(state => state.auth.user)
  const permissions = getPermissionsForUser(user?.role, user?.organizationRole)

  return {
    permissions,
    can: (
      keys: PermissionKey | readonly PermissionKey[],
      mode: PermissionMode = 'all'
    ) => hasPermission(permissions, keys, mode)
  }
}

export function useNotifications() {
  return {
    ...EMPTY_NOTIFICATIONS
  }
}

export function useActiveRouteTrail() {
  const pathname = usePathname()
  return findRouteTrail(pathname) ?? []
}
