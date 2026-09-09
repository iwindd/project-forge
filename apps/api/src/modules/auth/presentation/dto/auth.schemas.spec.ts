import { describe, expect, it } from 'vitest'
import { authMeDataSchema } from './auth.schemas.js'

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
    })

    expect(result.profile).toBeNull()
    expect(result).not.toHaveProperty('organizations')
  })

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
    })

    expect(result.success).toBe(false)
  })
})
