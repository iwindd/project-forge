import {
  IconFolders,
  IconHistory,
  IconMessageCircle2,
  IconRobot,
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
    id: 'chat',
    label: 'Chat',
    labelKey: 'chat',
    hideHeading: true,
    items: [
      routeItem('chat', {
        icon: IconMessageCircle2,
        labelKey: 'chat',
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
    id: 'agents',
    label: 'Agents',
    labelKey: 'agents',
    hideHeading: true,
    items: [
      routeItem('agents', {
        icon: IconRobot,
        labelKey: 'agents',
      }),
    ],
  },
  {
    id: 'audit',
    label: 'Activity',
    labelKey: 'activity',
    hideHeading: true,
    permissionKey: 'manageOrganization',
    items: [
      routeItem('auditLogs', {
        icon: IconHistory,
        labelKey: 'activity',
        permissionKey: 'manageOrganization',
      }),
    ],
  },
  {
    id: 'settings',
    label: 'Administration',
    labelKey: 'administration',
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
