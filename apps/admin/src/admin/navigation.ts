import {
  IconHistory,
  IconUser,
  IconUsers,
  type TablerIcon
} from '@tabler/icons-react'
import type { PermissionKey, PermissionMode } from './permissions'
import { getRoute } from './routes'

export type AdminNavigationItem = {
  id: string
  routeName?: string
  label: string
  icon?: TablerIcon
  href?: string
  notification?: string
  disabled?: boolean
  info?: string
  badge?: {
    label: string
    color?: string
  }
  items?: AdminNavigationItem[]
  /**
   * Keeps a submenu open by default in the drawer sidebar, even when none of
   * its children match the active route.
   */
  defaultOpened?: boolean
  permissionKey?: PermissionKey | readonly PermissionKey[]
  permissionMode?: PermissionMode
}

export type AdminNavigationGroup = {
  id: string
  label: string
  items: AdminNavigationItem[]
  permissionKey?: PermissionKey | readonly PermissionKey[]
  permissionMode?: PermissionMode
}

type RouteItemOptions = Omit<
  AdminNavigationItem,
  'id' | 'routeName' | 'label' | 'href' | 'disabled'
> & {
  label?: string
  disabled?: boolean
}

function routeItem(
  routeName: string,
  options: RouteItemOptions = {}
): AdminNavigationItem {
  const route = getRoute(routeName)
  const {
    label = route.label,
    disabled = route.disabled,
    ...itemOptions
  } = options

  return {
    id: route.name,
    routeName: route.name,
    label,
    href: route.path,
    disabled,
    ...itemOptions
  }
}

export const adminNavigation: AdminNavigationGroup[] = [
  {
    id: 'settings',
    label: 'ตั้งค่า',
    permissionKey: 'manageUsers',
    items: [
      routeItem('settings.members', {
        icon: IconUsers,
        permissionKey: 'manageUsers'
      })
    ]
  }
]

export const adminRootNavigation: AdminNavigationGroup[] = [
  {
    id: 'system',
    label: 'ระบบ',
    permissionKey: ['manageUsers', 'viewAuditLogs'],
    permissionMode: 'any',
    items: [
      routeItem('admin.users', {
        icon: IconUsers,
        permissionKey: 'manageUsers'
      }),
      routeItem('admin.activities', {
        icon: IconHistory,
        permissionKey: 'viewAuditLogs'
      })
    ]
  }
]

export const accountNavigation: AdminNavigationGroup[] = [
  {
    id: 'profile',
    label: 'โปรไฟล์',
    items: [
      routeItem('account.settings', {
        icon: IconUser
      }),
      routeItem('account.activity', {
        icon: IconHistory
      })
    ]
  }
]
