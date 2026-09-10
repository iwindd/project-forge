import type { OrganizationMemberRole } from './types'

type InvitationRole = {
  id: string | null
  legacyRole: OrganizationMemberRole | null
}

export function getInvitationRoleOptions<T extends InvitationRole>(
  roles: readonly T[]
): Array<T & { id: string }> {
  return roles.filter(
    (role): role is T & { id: string } =>
      Boolean(role.id) &&
      (role.legacyRole === 'ADMIN' || role.legacyRole === 'MEMBER')
  )
}

export function getDefaultInvitationRoleId(
  roles: readonly InvitationRole[]
): string {
  const options = getInvitationRoleOptions(roles)
  return options.find(role => role.legacyRole === 'MEMBER')?.id ?? options[0]?.id ?? ''
}
