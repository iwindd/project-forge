import { describe, expect, it, vi } from 'vitest';
import { AccessStatus, UserRole } from '../../../users/domain/user.js';
import { CompleteGithubLoginUseCase } from './complete-github-login-use-case.js';

function createUseCase(overrides: Record<string, unknown> = {}) {
  const issueSession = (overrides.issueSession ?? {
    issueWithinTransaction: vi.fn().mockResolvedValue('session-token'),
  }) as { issueWithinTransaction: ReturnType<typeof vi.fn> };
  const useCase = new CompleteGithubLoginUseCase(
    (overrides.github ?? {
      exchangeCode: vi.fn().mockResolvedValue({
        profile: {
          id: 123,
          login: 'github-user',
          name: 'GitHub User',
          email: 'user@example.com',
          emailVerified: true,
          verifiedEmails: ['user@example.com'],
        },
        accessToken: 'access-token',
        scope: 'read:user user:email',
      }),
    }) as never,
    (overrides.users ?? {
      findByGithubUserId: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    }) as never,
    { encrypt: vi.fn(() => 'encrypted-token') } as never,
    { adminGithubIds: new Set() } as never,
    { run: vi.fn(async <T>(work: () => Promise<T>) => work()) } as never,
    (overrides.profilesAndConnections ?? {
      ensureProfile: vi.fn().mockResolvedValue(undefined),
      upsertConnection: vi.fn().mockResolvedValue(undefined),
    }) as never,
    (overrides.organizations ?? {
      listForUser: vi.fn().mockResolvedValue([]),
    }) as never,
    { record: vi.fn().mockResolvedValue(undefined) } as never,
    issueSession as never,
  );
  return { issueSession, useCase };
}

describe('CompleteGithubLoginUseCase', () => {
  it('rejects an empty OAuth code before calling external services', async () => {
    const { useCase } = createUseCase();

    await expect(useCase.execute('')).rejects.toThrow('OAuth code is required');
  });

  it('issues a session for a user without an invitation but does not create an organization', async () => {
    const profilesAndConnections = {
      ensureProfile: vi.fn().mockResolvedValue(undefined),
      upsertConnection: vi.fn().mockResolvedValue(undefined),
    };
    const organizations = { listForUser: vi.fn().mockResolvedValue([]) };
    const { issueSession, useCase } = createUseCase({
      profilesAndConnections,
      organizations,
    });

    const result = await useCase.execute('oauth-code');

    expect(result.principal.accessStatus).toBe(AccessStatus.PENDING);
    expect(result.sessionToken).toBe('session-token');
    expect(result.organizationSlug).toBeNull();
    expect(issueSession.issueWithinTransaction).toHaveBeenCalledOnce();
    expect(organizations.listForUser).toHaveBeenCalledOnce();
    expect(profilesAndConnections.upsertConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        providerEmailVerified: true,
        providerVerifiedEmails: ['user@example.com'],
      }),
    );
  });

  it('returns the first existing organization for an approved user', async () => {
    const existingUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      githubUserId: '123',
      githubLogin: 'approved-user',
      name: 'Approved User',
      avatarUrl: null,
      role: UserRole.USER,
      accessStatus: AccessStatus.APPROVED,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const organizations = {
      listForUser: vi.fn().mockResolvedValue([
        { organization: { id: 'organization-id', slug: 'project-forge' } },
      ]),
    };
    const { issueSession, useCase } = createUseCase({
      organizations,
      users: {
        findByGithubUserId: vi.fn().mockResolvedValue(existingUser),
        save: vi.fn().mockResolvedValue(undefined),
      },
    });

    const result = await useCase.execute('oauth-code');

    expect(result.sessionToken).toBe('session-token');
    expect(result.organizationSlug).toBe('project-forge');
    expect(issueSession.issueWithinTransaction).toHaveBeenCalledWith(existingUser.id);
  });
});
