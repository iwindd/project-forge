import { describe, expect, it, vi } from 'vitest';
import { ProfileController } from './profile.controller.js';

describe('ProfileController HTTP boundaries', () => {
  it('rejects invalid connection route parameters before querying persistence', async () => {
    const controller = new ProfileController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      controller.disconnect({ id: 'user-1' } as never, { id: 'not-a-uuid' }),
    ).rejects.toThrow();
  });

  it('accepts a nullable display name and preserves the standard response shape', async () => {
    const updatedAt = new Date('2026-09-10T00:00:00.000Z');
    const user = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Previous name',
      updatedAt,
    };
    const profile = {
      displayName: null,
      avatarUrl: null,
      bio: null,
      timezone: null,
      updatedAt,
    };
    const em = {
      findOne: vi.fn().mockResolvedValue(user),
      persist: vi.fn(),
      flush: vi.fn().mockResolvedValue(undefined),
    };
    const profileConnections = {
      updateProfile: vi.fn().mockResolvedValue(profile),
    };
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const controller = new ProfileController(
      em as never,
      profileConnections as never,
      {} as never,
      audit as never,
    );

    await expect(
      controller.update(
        { id: user.id } as never,
        { displayName: null },
      ),
    ).resolves.toEqual({
      data: {
        profile: {
          id: user.id,
          displayName: null,
          avatarUrl: null,
          bio: null,
          timezone: null,
          updatedAt: updatedAt.toISOString(),
        },
      },
    });

    expect(profileConnections.updateProfile).toHaveBeenCalledWith(user.id, {
      displayName: null,
    });
    expect(user.name).toBeNull();
  });
});
