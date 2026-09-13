import { describe, expect, it } from 'vitest';
import {
  authMeDataSchema,
  authMeResponseSchema,
  githubCallbackQuerySchema,
  githubStartQuerySchema,
  updateProfileSchema,
} from './auth.schemas.js';

describe('authMeDataSchema', () => {
  it('accepts identity and profile without organization context', () => {
    const result = authMeDataSchema.parse({
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        githubUserId: 'github-user',
        githubLogin: 'github-login',
        name: null,
        avatarUrl: null,
        role: 'ADMIN',
        accessStatus: 'APPROVED',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      profile: null,
    });

    expect(result.profile).toBeNull();
    expect(result).not.toHaveProperty('organizations');
  });

  it('rejects organization context leaking into the auth contract', () => {
    const result = authMeDataSchema.safeParse({
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        githubUserId: 'github-user',
        githubLogin: 'github-login',
        name: null,
        avatarUrl: null,
        role: 'ADMIN',
        accessStatus: 'APPROVED',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      profile: null,
      organizations: [],
    });

    expect(result.success).toBe(false);
  });

  it('validates the GitHub callback query at the controller boundary', () => {
    expect(githubCallbackQuerySchema.parse({ code: 'oauth-code', state: 'oauth-state' })).toEqual({
      code: 'oauth-code',
      state: 'oauth-state',
    });
    expect(() => githubCallbackQuerySchema.parse({ code: '', state: 'oauth-state' })).toThrow();
  });

  it('accepts only same-origin paths for OAuth continuation', () => {
    expect(githubStartQuerySchema.parse({ returnTo: '/invitations/token' })).toEqual({
      returnTo: '/invitations/token',
    });
    expect(() => githubStartQuerySchema.parse({ returnTo: 'https://evil.test' })).toThrow();
    expect(() => githubStartQuerySchema.parse({ returnTo: '//evil.test' })).toThrow();
  });

  it('validates profile update input at the controller boundary', () => {
    expect(updateProfileSchema.parse({ name: 'User' })).toEqual({
      name: 'User',
      reason: '',
    });
    expect(() => updateProfileSchema.parse({ name: ' ' })).toThrow();
  });

  it('validates the auth/me success envelope', () => {
    const data = authMeDataSchema.parse({
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        githubUserId: 'github-user',
        githubLogin: 'github-login',
        name: null,
        avatarUrl: null,
        role: 'USER',
        accessStatus: 'APPROVED',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      profile: null,
    });

    expect(authMeResponseSchema.parse({ data })).toEqual({ data });
    expect(() => authMeResponseSchema.parse(data)).toThrow();
  });
});
