/** Organization permission that governs Project mutations. */
const PROJECT_MANAGE_PERMISSION = 'project.manage' as const

type OrganizationRoleAuthority = {
  isOwner: boolean
  permissions: readonly string[]
}

export function canManageProjects(
  role: OrganizationRoleAuthority | null | undefined
): boolean {
  if (!role) return false

  return (
    role.isOwner || role.permissions.includes(PROJECT_MANAGE_PERMISSION)
  )
}
