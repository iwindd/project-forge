import { describe, expect, it, vi } from 'vitest'
import { AccessStatus, UserRole } from '../../users/domain/user.js'
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js'
import { AuthController } from './auth.controller.js'

describe('AuthController', () => {
  it('redirects an approved OAuth login to the resolved organization route', async () => {
    const completeGithubLogin = {
      execute: vi.fn().mockResolvedValue({
        principal: { accessStatus: AccessStatus.APPROVED },
        sessionToken: 'session-token',
        organizationSlug: 'personal-user'
      })
    }
    const response = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
      redirect: vi.fn()
    }
    const controller = new AuthController(
      {} as never,
      completeGithubLogin as never,
      {} as never,
      { adminOrigin: 'http://localhost:5051' } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    )

    await controller.callback(
      { code: 'oauth-code', state: 'expected-state' },
      { headers: { cookie: 'pf_oauth_state=expected-state' } } as never,
      response as never
    )

    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:5051/personal-user'
    )
    expect(response.cookie).toHaveBeenCalledWith(
      'pf_session',
      'session-token',
      expect.objectContaining({ httpOnly: true })
    )
  })

  it('keeps a session cookie for a pending OAuth login without organization access', async () => {
    const completeGithubLogin = {
      execute: vi.fn().mockResolvedValue({
        principal: { accessStatus: AccessStatus.PENDING },
        sessionToken: 'pending-session-token',
        organizationSlug: null
      })
    }
    const response = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
      redirect: vi.fn()
    }
    const controller = new AuthController(
      {} as never,
      completeGithubLogin as never,
      {} as never,
      { adminOrigin: 'http://localhost:5051' } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    )

    await controller.callback(
      { code: 'oauth-code', state: 'expected-state' },
      { headers: { cookie: 'pf_oauth_state=expected-state' } } as never,
      response as never
    )

    expect(response.cookie).toHaveBeenCalledWith(
      'pf_session',
      'pending-session-token',
      expect.objectContaining({ httpOnly: true })
    )
    expect(response.clearCookie).not.toHaveBeenCalledWith('pf_session', {
      path: '/'
    })
    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:5051/account'
    )
  })

  it('keeps organization context out of the auth/me response', async () => {
    const profileConnections = {
      findProfile: vi.fn().mockResolvedValue(null)
    }
    const principal: AuthenticatedPrincipal = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      githubUserId: 'github-user',
      githubLogin: 'github-login',
      name: 'User',
      avatarUrl: null,
      role: UserRole.USER,
      accessStatus: AccessStatus.APPROVED,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z')
    }

    const controller = new AuthController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      profileConnections as never,
      {} as never
    )

    const response = await controller.me(principal)

    expect(response).toEqual({
      data: {
        user: {
          ...principal,
          createdAt: principal.createdAt.toISOString(),
          updatedAt: principal.updatedAt.toISOString()
        },
        profile: null
      }
    })
    expect(response.data).not.toHaveProperty('organizations')
  })
})
