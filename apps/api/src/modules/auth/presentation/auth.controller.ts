import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards
} from '@nestjs/common'
import type { Request, Response } from 'express'
import {
  apiNullSuccessResponseSchema,
  apiSuccess,
} from '../../../common/http/api-response.js'
import type { AuditLogPort } from '../../../common/audit/audit.port.js'
import { AUDIT_LOGGER } from '../../../common/audit/audit.port.js'
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js'
import { Principal } from '../../../common/auth/principal.decorator.js'
import { SessionGuard } from '../../../common/auth/session.guard.js'
import type { UnitOfWork } from '../../../common/database/unit-of-work.port.js'
import { UNIT_OF_WORK } from '../../../common/database/unit-of-work.port.js'
import { getCookie } from '../../../common/http/request-context.js'
import type { SecurityLogPort } from '../../../common/security/security-log.port.js'
import { SECURITY_LOGGER } from '../../../common/security/security-log.port.js'
import type { UserRepository } from '../../users/application/ports/user.repository.js'
import { USER_REPOSITORY } from '../../users/application/ports/user.repository.js'
import type { AuthConfig } from '../application/ports/auth.ports.js'
import { AUTH_CONFIG } from '../application/ports/auth.ports.js'
import { CompleteGithubLoginUseCase } from '../application/use-cases/complete-github-login-use-case.js'
import { LogoutUseCase } from '../application/use-cases/logout-use-case.js'
import { StartGithubLoginUseCase } from '../application/use-cases/start-github-login-use-case.js'
import { ProfileConnectionRepository } from '../infrastructure/persistence/profile-connection.repository.js'
import {
  authMeDataSchema,
  authMeResponseSchema,
  authUpdateMeResponseSchema,
  githubCallbackQuerySchema,
  updateProfileSchema,
} from './dto/auth.schemas.js'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly startGithubLogin: StartGithubLoginUseCase,
    private readonly completeGithubLogin: CompleteGithubLoginUseCase,
    private readonly logout: LogoutUseCase,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
    private readonly profileConnections: ProfileConnectionRepository,
    @Inject(SECURITY_LOGGER) private readonly security: SecurityLogPort
  ) {}

  private adminRedirect(path: string) {
    return new URL(path, this.config.adminOrigin).toString()
  }

  @Get('github/start')
  start(@Res() response: Response) {
    const result = this.startGithubLogin.execute()
    response.cookie('pf_oauth_state', result.state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.cookieSecure,
      maxAge: 10 * 60 * 1000,
      path: '/'
    })
    return response.redirect(result.url)
  }

  @Get('github/callback')
  async callback(
    @Query() query: unknown,
    @Req() request: Request,
    @Res() response: Response
  ) {
    const parsedQuery = githubCallbackQuerySchema.safeParse(query)
    const expected = getCookie(request, 'pf_oauth_state')
    if (!parsedQuery.success || parsedQuery.data.state !== expected) {
      return response.redirect(
        this.adminRedirect('/admin/login?error=invalid_oauth_state')
      )
    }
    try {
      const result = await this.completeGithubLogin.execute(parsedQuery.data.code)
      response.clearCookie('pf_oauth_state', { path: '/' })
      if (result.sessionToken) {
        response.cookie('pf_session', result.sessionToken, {
          httpOnly: true,
          sameSite: 'lax',
          secure: this.config.cookieSecure,
          maxAge: this.config.sessionTtlSeconds * 1000,
          path: '/'
        })
      } else {
        response.clearCookie('pf_session', { path: '/' })
      }
      const destination = result.organizationSlug
        ? `/${encodeURIComponent(result.organizationSlug)}`
        : '/account'
      return response.redirect(this.adminRedirect(destination))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'github_login_failed'
      return response.redirect(
        this.adminRedirect(
          `/admin/login?error=${encodeURIComponent(message.slice(0, 120))}`
        )
      )
    }
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@Principal() principal: AuthenticatedPrincipal) {
    const profile = await this.profileConnections.findProfile(principal.id)
    const data = {
      user: {
        ...principal,
        createdAt: principal.createdAt.toISOString(),
        updatedAt: principal.updatedAt.toISOString(),
      },
      profile: profile
        ? {
            id: principal.id,
            displayName:
              profile.displayName ?? principal.name ?? principal.githubLogin,
            avatarUrl: profile.avatarUrl ?? principal.avatarUrl,
            bio: profile.bio,
            timezone: profile.timezone,
            updatedAt: profile.updatedAt.toISOString()
          }
        : null,
    }
    return authMeResponseSchema.parse(apiSuccess(authMeDataSchema.parse(data)))
  }

  @Patch('me')
  @UseGuards(SessionGuard)
  async updateMe(
    @Principal() principal: AuthenticatedPrincipal,
    @Body() body: unknown
  ) {
    const input = updateProfileSchema.parse(body)
    const data = await this.unitOfWork.run(async () => {
      const user = await this.users.findById(principal.id)
      if (!user) return { user: principal }
      const name = input.name.trim()
      if (name !== user.name) {
        const before = { name: user.name }
        user.name = name
        user.updatedAt = new Date()
        await this.users.save(user)
        await this.profileConnections.ensureProfile({
          userId: user.id,
          displayName: name,
          avatarUrl: user.avatarUrl
        })
        await this.audit.record({
          actorId: user.id,
          targetUserId: user.id,
          action: 'PROFILE_NAME_CHANGED',
          resourceType: 'PROFILE',
          resourceId: user.id,
          before,
          after: { name },
          reason: input.reason
        })
      }
      return { user: { ...user } }
    })
    return authUpdateMeResponseSchema.parse(apiSuccess({
      user: {
        ...data.user,
        createdAt: data.user.createdAt.toISOString(),
        updatedAt: data.user.updatedAt.toISOString(),
      },
    }))
  }

  @Post('logout')
  @UseGuards(SessionGuard)
  async logoutSession(@Req() request: Request, @Res() response: Response) {
    const principal = (
      request as Request & { principal?: AuthenticatedPrincipal }
    ).principal
    await this.logout.execute(getCookie(request, 'pf_session'))
    await this.security.record({
      organizationId: null,
      userId: principal?.id ?? null,
      event: 'LOGOUT'
    })
    response.clearCookie('pf_session', { path: '/' })
    return response
      .status(200)
      .json(apiNullSuccessResponseSchema.parse(apiSuccess(null)))
  }
}
