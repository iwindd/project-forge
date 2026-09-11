import { describe, expect, it, vi } from 'vitest';
import { ProfileController } from './profile.controller.js';

describe('ProfileController HTTP boundaries', () => {
  it('rejects invalid connection route parameters before querying persistence', async () => {
    const controller = new ProfileController({} as never, {} as never, {} as never, {} as never);

    await expect(controller.disconnect({ id: 'user-1' } as never, { id: 'not-a-uuid' })).rejects.toThrow();
  });

  it('reads identity and connections from the canonical connection repository', async () => {
    const user = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Ada',
      githubLogin: 'ada-old',
      avatarUrl: null,
      role: 'USER',
      accessStatus: 'APPROVED',
      createdAt: new Date('2026-09-10T00:00:00.000Z'),
    };
    const profile = {
      displayName: 'Ada Lovelace',
      avatarUrl: null,
      bio: null,
      timezone: 'Asia/Bangkok',
      updatedAt: new Date('2026-09-10T00:00:00.000Z'),
    };
    const em = { findOne: vi.fn().mockResolvedValue(user) };
    const profileConnections = {
      ensureProfile: vi.fn().mockResolvedValue(profile),
      findConnections: vi.fn().mockResolvedValue([
        {
          id: '650e8400-e29b-41d4-a716-446655440000',
          provider: 'GITHUB',
          providerUsername: 'ada',
          providerEmail: 'ada@example.com',
          connectedAt: new Date('2026-09-10T00:00:00.000Z'),
        },
      ]),
    };
    const controller = new ProfileController(em as never, profileConnections as never, {} as never, {} as never);

    await expect(controller.get({ id: user.id } as never)).resolves.toEqual({
      data: {
        profile: {
          id: user.id,
          displayName: 'Ada Lovelace',
          avatarUrl: null,
          bio: null,
          timezone: 'Asia/Bangkok',
          platformRole: 'USER',
          accountStatus: 'APPROVED',
          createdAt: user.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString(),
        },
        connections: [
          {
            id: '650e8400-e29b-41d4-a716-446655440000',
            provider: 'GITHUB',
            username: 'ada',
            email: 'ada@example.com',
            connectedAt: '2026-09-10T00:00:00.000Z',
          },
        ],
      },
    });

    expect(profileConnections.findConnections).toHaveBeenCalledWith(user.id);
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
    const controller = new ProfileController(em as never, profileConnections as never, {} as never, audit as never);

    await expect(controller.update({ id: user.id } as never, { displayName: null })).resolves.toEqual({
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
