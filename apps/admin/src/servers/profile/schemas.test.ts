import { describe, expect, it } from 'vitest'
import { profileUpdateResponseSchema } from './schemas'

describe('profile response contracts', () => {
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
})
