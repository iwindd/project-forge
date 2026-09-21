import { buildRouteUtility, ROUTER } from './lib/routing';

const organizationAppRoutes = ROUTER({
  organizationPicker: {
    path: '/~',
    label: 'เลือก Organization',
    navigationLabelKey: 'organizationPicker',
    hiddenBreadcrumb: true,
  },
  hermes: {
    path: '/hermes',
    label: 'Hermes',
    hiddenBreadcrumb: true,
    children: {
      chat: {
        path: '/hermes/chat',
        label: 'Chat',
        navigationLabelKey: 'chat',
        hiddenBreadcrumb: true,
        children: {
          session: {
            path: '/hermes/chat/:sessionId',
            label: 'Chat',
            navigationLabelKey: 'chat',
            hiddenBreadcrumb: true,
          },
        },
      },
      agents: {
        path: '/hermes/agents',
        label: 'Agents',
        navigationLabelKey: 'agents',
        hiddenBreadcrumb: true,
      },
    },
  },
  overview: {
    path: '/:organizationSlug',
    label: 'ภาพรวม',
    navigationLabelKey: 'overview',
    hiddenBreadcrumb: true,
  },
  projects: {
    path: '/:organizationSlug/projects',
    label: 'โปรเจกต์',
    navigationLabelKey: 'projects',
  },
  account: {
    path: '/account',
    label: 'บัญชีของฉัน',
    hiddenBreadcrumb: true,
    children: {
      settings: {
        path: '/account/settings',
        label: 'บัญชี',
        navigationLabelKey: 'account',
      },
      activity: {
        path: '/account/activity',
        label: 'ประวัติการทำรายการ',
        navigationLabelKey: 'activity',
      },
    },
  },
  login: {
    path: '/login',
    label: 'เข้าสู่ระบบ',
  },
  auditLogs: {
    path: '/:organizationSlug/audit-logs',
    label: 'ประวัติการทำรายการ',
    navigationLabelKey: 'auditLogs',
    permission: 'manageOrganization',
  },
  settings: {
    path: '/:organizationSlug/settings',
    label: 'ตั้งค่า',
    hiddenBreadcrumb: true,
    permission: 'manageOrganization',
    children: {
      members: {
        path: '/:organizationSlug/settings/members',
        label: 'สมาชิก',
        navigationLabelKey: 'members',
        permission: 'manageOrganization',
      },
      roles: {
        path: '/:organizationSlug/settings/roles',
        label: 'บทบาท',
        navigationLabelKey: 'roles',
        permission: 'manageOrganization',
        children: {
          new: {
            path: '/:organizationSlug/settings/roles/new',
            label: 'สร้างบทบาท',
            permission: 'manageOrganization',
          },
          edit: {
            path: '/:organizationSlug/settings/roles/:roleId',
            label: 'แก้ไขบทบาท',
            permission: 'manageOrganization',
          },
        },
      },
    },
  },
});

export const { getRoute, getPath, findRouteTrail } = buildRouteUtility(organizationAppRoutes);
