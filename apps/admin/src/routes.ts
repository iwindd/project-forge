import { buildRouteUtility, ROUTER } from './lib/routing'

const adminRoutes = ROUTER({
  overview: {
    path: '/:organizationSlug',
    label: 'ภาพรวม',
    navigationLabelKey: 'overview',
    hiddenBreadcrumb: true
  },
  projects: {
    path: '/:organizationSlug/projects',
    label: 'โปรเจกต์',
    navigationLabelKey: 'projects'
  },
  account: {
    path: '/account',
    label: 'บัญชีของฉัน',
    hiddenBreadcrumb: true,
    children: {
      settings: {
        path: '/account/settings',
        label: 'บัญชี',
        navigationLabelKey: 'account'
      },
      activity: {
        path: '/account/activity',
        label: 'ประวัติการทำรายการ',
        navigationLabelKey: 'activity'
      }
    }
  },
  profile: {
    path: '/:organizationSlug/profile',
    label: 'โปรไฟล์',
    navigationLabelKey: 'profile',
    children: {
      logging: {
        path: '/:organizationSlug/profile/logging',
        label: 'ประวัติการทำรายการ',
        navigationLabelKey: 'auditLogs'
      }
    }
  },
  login: {
    path: '/admin/login',
    label: 'เข้าสู่ระบบ'
  },
  system: {
    path: '/:organizationSlug/system',
    label: 'ระบบ',
    hiddenBreadcrumb: true,
    children: {
      users: {
        path: '/:organizationSlug/users',
        label: 'ผู้ใช้งาน',
        navigationLabelKey: 'users',
        permission: 'manageUsers'
      },
      auditLogs: {
        path: '/:organizationSlug/audit-logs',
        label: 'ประวัติการทำรายการ',
        navigationLabelKey: 'auditLogs',
        permission: 'manageOrganization'
      }
    }
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
        permission: 'manageOrganization'
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
            permission: 'manageOrganization'
          },
          edit: {
            path: '/:organizationSlug/settings/roles/:roleId',
            label: 'แก้ไขบทบาท',
            permission: 'manageOrganization'
          }
        }
      }
    }
  }
})

export const { getRoute, getPath, findRouteTrail } =
  buildRouteUtility(adminRoutes)
