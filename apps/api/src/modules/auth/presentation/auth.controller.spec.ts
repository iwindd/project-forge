import { describe, expect, it, vi } from 'vitest'
import { AccessStatus, UserRole } from '../../users/domain/user.js'
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js'
import { AuthController } from './auth.controller.js'

describe('AuthController', () => {
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
