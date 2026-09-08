import {
  IconFolder,
  IconLayoutDashboard,
  IconPlus,
  IconShieldLock,
  IconUsers,
  type TablerIcon,
} from '@tabler/icons-react';

export type AdminNavigationItem = {
  id: string;
  label: string;
  href?: string;
  icon?: TablerIcon;
  items?: AdminNavigationItem[];
  defaultOpened?: boolean;
  adminOnly?: boolean;
  info?: string;
};

export type AdminNavigationGroup = {
  id: string;
  label: string;
  items: AdminNavigationItem[];
  adminOnly?: boolean;
};

export const adminNavigation: AdminNavigationGroup[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '/', icon: IconLayoutDashboard },
      { id: 'projects', label: 'Projects', href: '/projects', icon: IconFolder },
      { id: 'projects.new', label: 'Add project', href: '/projects/new', icon: IconPlus },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    adminOnly: true,
    items: [
      { id: 'users', label: 'Users', href: '/admin/users', icon: IconUsers, adminOnly: true },
      {
        id: 'access-requests',
        label: 'Access requests',
        href: '/admin/access-requests',
        icon: IconShieldLock,
        adminOnly: true,
      },
    ],
  },
];
