import { buildRouteUtility, ROUTER } from './routing'

const adminRoutes = ROUTER({
  profile: {
    path: '/:organizationSlug/profile',
    label: 'โปรไฟล์',
    children: {
      logging: {
        path: '/:organizationSlug/profile/logging',
        label: 'ประวัติการทำรายการ'
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
        permission: 'manageUsers',
        children: {
          profile: {
            path: '/:organizationSlug/users/:userId/profile',
            label: 'รายละเอียดผู้ใช้งาน',
            permission: 'manageUsers'
          },
          logging: {
            path: '/:organizationSlug/users/:userId/logging',
            label: 'ประวัติการทำรายการ',
            permission: 'manageUsers'
          }
        }
      },
      auditLogs: {
        path: '/:organizationSlug/audit-logs',
        label: 'ประวัติการทำรายการ',
        permission: 'viewAuditLogs'
      }
    }
  },
  settings: {
    path: '/:organizationSlug/settings',
    label: 'ตั้งค่า',
    hiddenBreadcrumb: true,
    permission: 'manageUsers',
    children: {
      members: {
        path: '/:organizationSlug/settings/members',
        label: 'สมาชิก',
        permission: 'manageUsers'
      }
    }
  }
})

export const { getRoute, getPath, findRouteTrail } =
  buildRouteUtility(adminRoutes)
