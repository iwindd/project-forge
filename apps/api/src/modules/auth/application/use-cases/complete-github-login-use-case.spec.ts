import { describe, expect, it, vi } from 'vitest';
import { AccessStatus, UserRole } from '../../../users/domain/user.js';
import { CompleteGithubLoginUseCase } from './complete-github-login-use-case.js';

describe('CompleteGithubLoginUseCase', () => {
  it('rejects an empty OAuth code before calling external services', async () => {
    const useCase = new CompleteGithubLoginUseCase(
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
    );

    await expect(useCase.execute('')).rejects.toThrow('OAuth code is required');
  });

  it('creates an access request without issuing a session for a pending user', async () => {
    const github = {
      exchangeCode: vi.fn().mockResolvedValue({
        profile: { id: 123, login: 'pending-user', name: 'Pending User' },
        accessToken: 'access-token',
        scope: 'read:user',
      }),
    };
    const users = {
      findByGithubUserId: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const accessRequests = {
      findPendingByUserId: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const issueSession = { issueWithinTransaction: vi.fn() };
    const useCase = new CompleteGithubLoginUseCase(
      github as never,
      users as never,
      accessRequests as never,
      { encrypt: vi.fn(() => 'encrypted-token') } as never,
      { adminGithubIds: new Set() } as never,
      { run: vi.fn(async <T>(work: () => Promise<T>) => work()) } as never,
      {
        ensureProfile: vi.fn().mockResolvedValue(undefined),
        upsertConnection: vi.fn().mockResolvedValue(undefined),
      } as never,
      {
        ensurePersonalWorkspace: vi.fn().mockResolvedValue({
          id: '550e8400-e29b-41d4-a716-446655440001',
          slug: 'personal-pending-user',
        }),
      } as never,
      { record: vi.fn().mockResolvedValue(undefined) } as never,
      issueSession as never,
    );

    const result = await useCase.execute('oauth-code');

    expect(result.principal.accessStatus).toBe(AccessStatus.PENDING);
    expect(result.sessionToken).toBeNull();
    expect(accessRequests.save).toHaveBeenCalledOnce();
    expect(issueSession.issueWithinTransaction).not.toHaveBeenCalled();
  });

  it('issues a session for an approved user', async () => {
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
    const issueSession = { issueWithinTransaction: vi.fn().mockResolvedValue('session-token') };
    const useCase = new CompleteGithubLoginUseCase(
      {
        exchangeCode: vi.fn().mockResolvedValue({
          profile: { id: 123, login: 'approved-user' },
          accessToken: 'access-token',
          scope: null,
        }),
      } as never,
      {
        findByGithubUserId: vi.fn().mockResolvedValue(existingUser),
        save: vi.fn().mockResolvedValue(undefined),
      } as never,
      { findPendingByUserId: vi.fn().mockResolvedValue(null) } as never,
      { encrypt: vi.fn(() => 'encrypted-token') } as never,
      { adminGithubIds: new Set() } as never,
      { run: vi.fn(async <T>(work: () => Promise<T>) => work()) } as never,
      {
        ensureProfile: vi.fn().mockResolvedValue(undefined),
        upsertConnection: vi.fn().mockResolvedValue(undefined),
      } as never,
      {
        ensurePersonalWorkspace: vi.fn().mockResolvedValue({
          id: '550e8400-e29b-41d4-a716-446655440001',
          slug: 'personal-approved-user',
        }),
      } as never,
      { record: vi.fn().mockResolvedValue(undefined) } as never,
      issueSession as never,
    );

    const result = await useCase.execute('oauth-code');

    expect(result.sessionToken).toBe('session-token');
    expect(issueSession.issueWithinTransaction).toHaveBeenCalledWith(existingUser.id);
  });
});
