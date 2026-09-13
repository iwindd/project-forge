import { describe, expect, it } from 'vitest';
import { inviteMemberFormSchema } from './organization-switcher';

describe('organization switcher form contracts', () => {
  it('accepts a verified-email invitation and a database role id', () => {
    expect(
      inviteMemberFormSchema.parse({
        email: 'person@example.com',
        roleId: '00000000-0000-0000-0000-000000000001',
      }),
    ).toEqual({
      email: 'person@example.com',
      roleId: '00000000-0000-0000-0000-000000000001',
    });
  });

  it('rejects an invalid invite email or role id', () => {
    expect(() =>
      inviteMemberFormSchema.parse({
        email: 'not-an-email',
        roleId: 'role-id',
      }),
    ).toThrow();
  });
});
