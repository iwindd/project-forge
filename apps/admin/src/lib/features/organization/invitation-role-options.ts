import type { OrganizationMemberRole } from './types';

type InvitationRole = {
  id: string;
  code: OrganizationMemberRole | null;
};

export function getInvitationRoleOptions<T extends InvitationRole>(roles: readonly T[]): Array<T & { id: string }> {
  return roles.filter((role): role is T => role.code === 'ADMIN' || role.code === 'MEMBER');
}

export function getDefaultInvitationRoleId(roles: readonly InvitationRole[]): string {
  const options = getInvitationRoleOptions(roles);
  return options.find((role) => role.code === 'MEMBER')?.id ?? options[0]?.id ?? '';
}
