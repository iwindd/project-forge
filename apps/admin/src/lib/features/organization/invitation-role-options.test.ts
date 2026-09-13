import { describe, expect, it } from 'vitest';
import { getDefaultInvitationRoleId, getInvitationRoleOptions } from './invitation-role-options';

describe('invitation role options', () => {
  it('keeps only persisted Admin and Member roles with ids', () => {
    const roles = [
      { id: 'owner', code: 'OWNER' as const },
      { id: 'custom', code: null },
      { id: 'admin', code: 'ADMIN' as const },
      { id: 'member', code: 'MEMBER' as const },
    ];

    expect(getInvitationRoleOptions(roles)).toEqual([
      { id: 'admin', code: 'ADMIN' },
      { id: 'member', code: 'MEMBER' },
    ]);
  });

  it('prefers the built-in Member role as the default', () => {
    expect(
      getDefaultInvitationRoleId([
        { id: 'admin', code: 'ADMIN' },
        { id: 'member', code: 'MEMBER' },
      ]),
    ).toBe('member');
  });
});
