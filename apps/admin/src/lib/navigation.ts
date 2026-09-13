import {
  IconFolders,
  IconHistory,
  IconLayoutDashboard,
  IconUser,
  IconUsers,
  type TablerIcon,
} from '@tabler/icons-react';
import type { PermissionKey, PermissionMode } from './permissions';
import { getRoute } from '../routes';

export type AdminNavigationItem = {
  id: string;
  routeName?: string;
  label: string;
  labelKey?: string;
  icon?: TablerIcon;
  href?: string;
  notification?: string;
  disabled?: boolean;
  info?: string;
  badge?: {
    label: string;
    color?: string;
  };
  items?: AdminNavigationItem[];
  /**
   * Keeps a submenu open by default in the drawer sidebar, even when none of
   * its children match the active route.
   */
  defaultOpened?: boolean;
  permissionKey?: PermissionKey | readonly PermissionKey[];
  permissionMode?: PermissionMode;
};

export type AdminNavigationGroup = {
  id: string;
  label: string;
  labelKey?: string;
  items: AdminNavigationItem[];
  hideHeading?: boolean;
  permissionKey?: PermissionKey | readonly PermissionKey[];
  permissionMode?: PermissionMode;
};

type RouteItemOptions = Omit<AdminNavigationItem, 'id' | 'routeName' | 'label' | 'href' | 'disabled'> & {
  label?: string;
  disabled?: boolean;
};

function routeItem(routeName: string, options: RouteItemOptions = {}): AdminNavigationItem {
  const route = getRoute(routeName);
  const { label = route.label, disabled = route.disabled, ...itemOptions } = options;

  return {
    id: route.name,
    routeName: route.name,
    label,
    href: route.path,
    disabled,
    ...itemOptions,
  };
}

export const organizationNavigation: AdminNavigationGroup[] = [
  {
    id: 'overview',
    label: 'ภาพรวม',
    labelKey: 'overview',
    hideHeading: true,
    items: [
      routeItem('overview', {
        icon: IconLayoutDashboard,
        labelKey: 'overview',
      }),
    ],
  },
  {
    id: 'projects',
    label: 'โปรเจกต์',
    labelKey: 'projects',
    items: [
      routeItem('projects', {
        icon: IconFolders,
        labelKey: 'projects',
      }),
    ],
  },
  {
    id: 'audit',
    label: 'ประวัติการทำรายการ',
    labelKey: 'auditLogs',
    hideHeading: true,
    permissionKey: 'manageOrganization',
    items: [
      routeItem('auditLogs', {
        icon: IconHistory,
        labelKey: 'auditLogs',
        permissionKey: 'manageOrganization',
      }),
    ],
  },
  {
    id: 'settings',
    label: 'ตั้งค่า',
    labelKey: 'settings',
    permissionKey: 'manageOrganization',
    items: [
      routeItem('settings.members', {
        icon: IconUsers,
        labelKey: 'members',
        permissionKey: 'manageOrganization',
      }),
      routeItem('settings.roles', {
        icon: IconUsers,
        labelKey: 'roles',
        permissionKey: 'manageOrganization',
      }),
    ],
  },
];

export const accountNavigation: AdminNavigationGroup[] = [
  {
    id: 'profile',
    label: 'โปรไฟล์',
    labelKey: 'profile',
    items: [
      routeItem('account.settings', {
        icon: IconUser,
        labelKey: 'account',
      }),
      routeItem('account.activity', {
        icon: IconHistory,
        labelKey: 'activity',
      }),
    ],
  },
];
