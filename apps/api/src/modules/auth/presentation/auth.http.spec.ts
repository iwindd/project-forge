import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { AUDIT_LOGGER } from '../../../common/audit/audit.port.js'
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js'
import { SESSION_AUTHENTICATOR } from '../../../common/auth/auth.types.js'
import { SessionGuard } from '../../../common/auth/session.guard.js'
import { PublicErrorFilter } from '../../../common/errors/public-error.filter.js'
import { SECURITY_LOGGER } from '../../../common/security/security-log.port.js'
import { UNIT_OF_WORK } from '../../../common/database/unit-of-work.port.js'
import { USER_REPOSITORY } from '../../users/application/ports/user.repository.js'
import { AccessStatus, UserRole } from '../../users/domain/user.js'
import { OrganizationService } from '../../organizations/application/organization.service.js'
import { CancelOrganizationInvitationUseCase } from '../../organizations/application/use-cases/cancel-organization-invitation-use-case.js'
import { OrganizationStatus, OrganizationType, OrganizationMemberRole } from '../../organizations/domain/organization.js'
import { CreateOrganizationRoleUseCase } from '../../organizations/application/use-cases/create-organization-role-use-case.js'
import { DeleteOrganizationRoleUseCase } from '../../organizations/application/use-cases/delete-organization-role-use-case.js'
import { ListOrganizationMembersUseCase } from '../../organizations/application/use-cases/list-organization-members-use-case.js'
import { ListOrganizationRolesUseCase } from '../../organizations/application/use-cases/list-organization-roles-use-case.js'
import { UpdateOrganizationRoleUseCase } from '../../organizations/application/use-cases/update-organization-role-use-case.js'
import { OrganizationsController } from '../../organizations/presentation/organizations.controller.js'
import { AUTH_CONFIG } from '../application/ports/auth.ports.js'
import { CompleteGithubLoginUseCase } from '../application/use-cases/complete-github-login-use-case.js'
import { LogoutUseCase } from '../application/use-cases/logout-use-case.js'
import { StartGithubLoginUseCase } from '../application/use-cases/start-github-login-use-case.js'
import { ProfileConnectionRepository } from '../infrastructure/persistence/profile-connection.repository.js'
import { AuthController } from './auth.controller.js'

const userId = '550e8400-e29b-41d4-a716-446655440000'
const organizationId = '550e8400-e29b-41d4-a716-446655440001'
const organizationRoleId = '550e8400-e29b-41d4-a716-446655440002'
const createdAt = new Date('2026-01-01T00:00:00.000Z')
const updatedAt = new Date('2026-01-02T00:00:00.000Z')

const principal: AuthenticatedPrincipal = {
  id: userId,
  githubUserId: 'github-user',
  githubLogin: 'github-login',
  name: 'User',
  avatarUrl: null,
  role: UserRole.USER,
  accessStatus: AccessStatus.APPROVED,
  isActive: true,
  createdAt,
  updatedAt,
}

const organization = {
  id: organizationId,
  name: 'Organization A',
  slug: 'organization-a',
  type: OrganizationType.SHARED,
  status: OrganizationStatus.ACTIVE,
  createdAt,
  updatedAt,
}

const organizationRole = {
  id: organizationRoleId,
  name: 'สมาชิก',
  permissions: [],
  isOwner: false,
  code: OrganizationMemberRole.MEMBER,
}

describe('auth HTTP contracts', () => {
  let app: INestApplication
  let baseUrl: string
  const authenticator = {
    principalFromToken: vi.fn(async (token: string | undefined) =>
      token === 'valid-session' ? principal : null,
    ),
  }
  const profileConnections = {
    findProfile: vi.fn(async () => null),
  }
  const organizations = {
    listForUser: vi.fn(async () => [{ organization, role: organizationRole }]),
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, OrganizationsController],
      providers: [
        SessionGuard,
        { provide: SESSION_AUTHENTICATOR, useValue: authenticator },
        { provide: StartGithubLoginUseCase, useValue: { execute: vi.fn() } },
        { provide: CompleteGithubLoginUseCase, useValue: { execute: vi.fn() } },
        { provide: LogoutUseCase, useValue: { execute: vi.fn() } },
        {
          provide: AUTH_CONFIG,
          useValue: {
            adminOrigin: 'http://localhost:5051',
            cookieSecure: false,
            sessionTtlSeconds: 3600,
          },
        },
        { provide: USER_REPOSITORY, useValue: {} },
        { provide: AUDIT_LOGGER, useValue: {} },
        { provide: UNIT_OF_WORK, useValue: {} },
        { provide: ProfileConnectionRepository, useValue: profileConnections },
        { provide: SECURITY_LOGGER, useValue: {} },
        { provide: OrganizationService, useValue: organizations },
        { provide: ListOrganizationMembersUseCase, useValue: {} },
        { provide: ListOrganizationRolesUseCase, useValue: {} },
        { provide: CreateOrganizationRoleUseCase, useValue: {} },
        { provide: UpdateOrganizationRoleUseCase, useValue: {} },
        { provide: DeleteOrganizationRoleUseCase, useValue: {} },
        { provide: CancelOrganizationInvitationUseCase, useValue: {} },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalFilters(new PublicErrorFilter())
    await app.listen(0, '127.0.0.1')
    baseUrl = await app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns the standard unauthenticated contract for auth/me without a session cookie', async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { 'x-request-id': 'auth-request' },
    })
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Please sign in with GitHub',
        details: {},
        requestId: 'auth-request',
      },
    })
    expect(response.headers.get('x-request-id')).toBe('auth-request')
  })

  it('uses the session cookie to return auth/me and organization-list envelopes', async () => {
    const authResponse = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { cookie: 'pf_session=valid-session' },
    })
    const authBody = await authResponse.json()
    const organizationResponse = await fetch(`${baseUrl}/api/v1/organizations`, {
      headers: { cookie: 'pf_session=valid-session' },
    })
    const organizationBody = await organizationResponse.json()

    expect(authResponse.status).toBe(200)
    expect(authBody).toEqual({
      data: {
        user: {
          ...principal,
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        },
        profile: null,
      },
    })
    expect(organizationResponse.status).toBe(200)
    expect(organizationBody).toEqual({
      data: [
        {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          type: organization.type,
          status: organization.status,
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
          role: organizationRole,
        },
      ],
    })
    expect(authenticator.principalFromToken).toHaveBeenCalledWith('valid-session')
    expect(organizations.listForUser).toHaveBeenCalledWith(userId)
  })

  it('returns the same unauthenticated contract for organization-list requests without a session', async () => {
    const response = await fetch(`${baseUrl}/api/v1/organizations`)
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('UNAUTHENTICATED')
    expect(organizations.listForUser).toHaveBeenCalledTimes(1)
  })
})
