import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { ProfileController } from './profile.controller.js';

function request(requestId: string): Request {
  return {
    header: vi.fn((name: string) => (name === 'x-request-id' ? requestId : undefined)),
  } as unknown as Request;
}

describe('ProfileController HTTP boundaries', () => {
  it('rejects invalid connection route parameters before querying persistence', async () => {
    const controller = new ProfileController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { run: async (work: () => Promise<unknown>) => work() } as never,
    );

    await expect(
      controller.disconnect({ id: 'user-1' } as never, { id: 'not-a-uuid' }, request('request-id')),
    ).rejects.toThrow();
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
    const controller = new ProfileController(
      em as never,
      profileConnections as never,
      {} as never,
      {} as never,
      { run: async (work: () => Promise<unknown>) => work() } as never,
    );

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
      bio: 'Updated bio',
      timezone: 'UTC',
      updatedAt,
    };
    const beforeProfile: {
      displayName: string | null;
      avatarUrl: string | null;
      bio: string | null;
      timezone: string | null;
      updatedAt: Date;
    } = {
      displayName: 'Previous name',
      avatarUrl: null,
      bio: 'Previous bio',
      timezone: 'Asia/Bangkok',
      updatedAt,
    };
    const em = {
      findOne: vi.fn().mockResolvedValue(user),
      persist: vi.fn(),
      flush: vi.fn().mockResolvedValue(undefined),
    };
    const profileConnections = {
      findProfile: vi.fn().mockResolvedValue(beforeProfile),
      updateProfile: vi.fn().mockImplementation(async () => {
        beforeProfile.displayName = profile.displayName;
        beforeProfile.bio = profile.bio;
        beforeProfile.timezone = profile.timezone;
        beforeProfile.avatarUrl = profile.avatarUrl;
        beforeProfile.updatedAt = profile.updatedAt;
        return beforeProfile;
      }),
    };
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const controller = new ProfileController(
      em as never,
      profileConnections as never,
      {} as never,
      audit as never,
      { run: async (work: () => Promise<unknown>) => work() } as never,
    );

    await expect(
      controller.update({ id: user.id } as never, { displayName: null }, request('profile-update-request')),
    ).resolves.toEqual({
      data: {
        profile: {
          id: user.id,
          displayName: null,
          avatarUrl: null,
          bio: 'Updated bio',
          timezone: 'UTC',
          updatedAt: updatedAt.toISOString(),
        },
      },
    });

    expect(profileConnections.updateProfile).toHaveBeenCalledWith(user.id, {
      displayName: null,
    });
    expect(audit.record).toHaveBeenCalledWith({
      actorId: user.id,
      targetUserId: user.id,
      action: 'PROFILE_UPDATED',
      resourceType: 'PROFILE',
      resourceId: user.id,
      before: { displayName: 'Previous name', bio: 'Previous bio', timezone: 'Asia/Bangkok' },
      after: { displayName: null, bio: 'Updated bio', timezone: 'UTC' },
      requestId: 'profile-update-request',
    });
    expect(user.name).toBeNull();
  });

  it('includes the request ID in connection removal audit records', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const connectionId = '650e8400-e29b-41d4-a716-446655440000';
    const connection = { id: connectionId, userId, provider: 'GITHUB' };
    const em = {
      findOne: vi.fn().mockResolvedValue(connection),
      count: vi.fn().mockResolvedValue(2),
      remove: vi.fn(),
    };
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const security = { record: vi.fn().mockResolvedValue(undefined) };
    const controller = new ProfileController(
      em as never,
      {} as never,
      security as never,
      audit as never,
      { run: async (work: () => Promise<unknown>) => work() } as never,
    );

    await expect(
      controller.disconnect({ id: userId } as never, { id: connectionId }, request('connection-removal-request')),
    ).resolves.toEqual({ data: null });

    expect(audit.record).toHaveBeenCalledWith({
      actorId: userId,
      targetUserId: userId,
      action: 'OAUTH_CONNECTION_REMOVED',
      resourceType: 'CONNECTION',
      resourceId: connectionId,
      before: { provider: 'GITHUB' },
      requestId: 'connection-removal-request',
    });
  });
});
