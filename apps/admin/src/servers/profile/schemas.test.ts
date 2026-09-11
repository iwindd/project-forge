import { describe, expect, it } from 'vitest'
import {
  profileResponseEnvelopeSchema,
  profileResponseSchema,
  profileUpdateResponseSchema
} from './schemas'

const profileData = {
  profile: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    displayName: 'Ada',
    avatarUrl: null,
    bio: null,
    timezone: null,
    platformRole: 'USER' as const,
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z'
  },
  connections: [
    {
      id: '650e8400-e29b-41d4-a716-446655440000',
      provider: 'GITHUB' as const,
      username: 'ada',
      email: 'ada@example.com',
      connectedAt: '2026-09-10T00:00:00.000Z'
    }
  ]
}

describe('profile transport schemas', () => {
  it('accepts a cleared display name in a profile update response', () => {
    expect(
      profileUpdateResponseSchema.parse({
        profile: {
          id: 'profile-id',
          displayName: null,
          avatarUrl: null,
          bio: null,
          timezone: null,
          updatedAt: '2026-09-10T00:00:00.000Z'
        }
      }).profile.displayName
    ).toBeNull()
  })

  it('validates the standard success envelope', () => {
    expect(profileResponseEnvelopeSchema.parse({ data: profileData })).toEqual({
      data: profileData
    })
  })

  it('rejects a non-GitHub external identity', () => {
    expect(() => profileResponseSchema.parse({
      ...profileData,
      connections: [{ ...profileData.connections[0], provider: 'GOOGLE' }]
    })).toThrow()
  })
})
