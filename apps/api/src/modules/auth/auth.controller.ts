import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards
} from '@nestjs/common'
import type { Request, Response } from 'express'
import type { AuthenticatedPrincipal } from '../../common/auth/auth.types.js'
import { Principal } from '../../common/auth/principal.decorator.js'
import { SessionGuard } from '../../common/auth/session.guard.js'
import { getCookie } from '../../common/http.js'
import { AuthService } from './auth.service.js'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('github/start')
  start(@Res() response: Response) {
    const result = this.auth.githubStartUrl()
    response.cookie('pf_oauth_state', result.state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 10 * 60 * 1000,
      path: '/'
    })
    return response.redirect(result.url)
  }

  @Get('github/callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() request: Request,
    @Res() response: Response
  ) {
    const expected = getCookie(request, 'pf_oauth_state')
    const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:3000'
    if (!code || !state || state !== expected)
      return response.redirect(`${webOrigin}/login?error=invalid_oauth_state`)
    try {
      const result = await this.auth.completeGithubLogin(code)
      response.clearCookie('pf_oauth_state', { path: '/' })
      response.cookie('pf_session', result.sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.COOKIE_SECURE === 'true',
        maxAge: Number(process.env.SESSION_TTL_SECONDS || 604800) * 1000,
        path: '/'
      })
      const destination =
        result.principal.accessStatus === 'APPROVED' ? '/' : '/access-pending'
      return response.redirect(`${webOrigin}${destination}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'github_login_failed'
      return response.redirect(
        `${webOrigin}/login?error=${encodeURIComponent(message.slice(0, 120))}`
      )
    }
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@Principal() principal: AuthenticatedPrincipal) {
    return { user: principal }
  }

  @Post('logout')
  @UseGuards(SessionGuard)
  async logout(@Req() request: Request, @Res() response: Response) {
    await this.auth.revokeToken(getCookie(request, 'pf_session'))
    response.clearCookie('pf_session', { path: '/' })
    return response.status(204).send()
  }
}
