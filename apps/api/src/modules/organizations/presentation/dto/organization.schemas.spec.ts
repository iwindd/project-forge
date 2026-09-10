import { describe, expect, it } from 'vitest';
import { OrganizationMemberRole } from '../../domain/organization.js';
import { createInvitationSchema } from './organization.schemas.js';

describe('createInvitationSchema', () => {
  it('defaults an omitted invitation role to Member', () => {
    expect(createInvitationSchema.parse({ email: 'person@example.com' })).toEqual({
      email: 'person@example.com',
      role: OrganizationMemberRole.MEMBER,
    });
  });

  it('accepts only the assignable built-in invitation roles', () => {
    expect(
      createInvitationSchema.parse({
        email: 'admin@example.com',
        role: OrganizationMemberRole.ADMIN,
      }).role,
    ).toBe(OrganizationMemberRole.ADMIN);
    expect(() =>
      createInvitationSchema.parse({
        email: 'owner@example.com',
        role: OrganizationMemberRole.OWNER,
      }),
    ).toThrow();
  });

  it('requires an invitation email', () => {
    expect(() => createInvitationSchema.parse({})).toThrow();
  });
});
