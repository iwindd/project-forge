import { buildRouteUtility, ROUTER } from './routing'

const adminRoutes = ROUTER({
  overview: {
    path: '/:organizationSlug',
    label: 'ภาพรวม',
    hiddenBreadcrumb: true
  },
  account: {
    path: '/account',
    label: 'บัญชีของฉัน',
    hiddenBreadcrumb: true,
    children: {
      settings: {
        path: '/account/settings',
        label: 'บัญชี'
      },
      activity: {
        path: '/account/activity',
        label: 'ประวัติการทำรายการ'
      }
    }
  },
  admin: {
    path: '/admin',
    label: 'ระบบจัดการ',
    hiddenBreadcrumb: true,
    children: {
      users: {
        path: '/admin/users',
        label: 'ผู้ใช้งาน',
        permission: 'manageUsers'
      },
      activities: {
        path: '/admin/activities',
        label: 'ประวัติการทำรายการ',
        permission: 'viewAuditLogs'
      }
    }
  },
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
    permission: 'manageOrganization',
    children: {
      members: {
        path: '/:organizationSlug/settings/members',
        label: 'สมาชิก',
        permission: 'manageOrganization'
      },
      roles: {
        path: '/:organizationSlug/settings/roles',
        label: 'บทบาท',
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
