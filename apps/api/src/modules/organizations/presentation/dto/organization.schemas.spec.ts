import { describe, expect, it } from 'vitest';
import { createInvitationSchema } from './organization.schemas.js';

describe('createInvitationSchema', () => {
  it('requires a persisted organization role id', () => {
    expect(createInvitationSchema.parse({
      email: 'person@example.com',
      roleId: '550e8400-e29b-41d4-a716-446655440000',
    })).toEqual({
      email: 'person@example.com',
      roleId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(() => createInvitationSchema.parse({ email: 'person@example.com' })).toThrow();
  });

  it('does not accept the removed role-name compatibility field', () => {
    expect(() =>
      createInvitationSchema.parse({
        email: 'owner@example.com',
        role: 'OWNER',
        roleId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    ).toThrow();
  });

  it('requires an invitation email', () => {
    expect(() => createInvitationSchema.parse({})).toThrow();
  });
});
