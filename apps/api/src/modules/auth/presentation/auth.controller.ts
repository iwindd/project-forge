import { Inject, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Principal } from '../../../common/auth/principal.decorator.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { getCookie } from '../../../common/http/request-context.js';
import { AUTH_CONFIG } from '../application/ports/auth.ports.js';
import type { AuthConfig } from '../application/ports/auth.ports.js';
import { CompleteGithubLoginUseCase } from '../application/use-cases/complete-github-login.use-case.js';
import { LogoutUseCase } from '../application/use-cases/session.use-cases.js';
import { StartGithubLoginUseCase } from '../application/use-cases/start-github-login.use-case.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly startGithubLogin: StartGithubLoginUseCase,
    private readonly completeGithubLogin: CompleteGithubLoginUseCase,
    private readonly logout: LogoutUseCase,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  private adminRedirect(path: string) {
    return new URL(path, this.config.adminOrigin).toString();
  }

  @Get('github/start')
  start(@Res() response: Response) {
    const result = this.startGithubLogin.execute();
    response.cookie('pf_oauth_state', result.state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.cookieSecure,
      maxAge: 10 * 60 * 1000,
      path: '/',
    });
    return response.redirect(result.url);
  }

  @Get('github/callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const expected = getCookie(request, 'pf_oauth_state');
    if (!code || !state || state !== expected) {
      return response.redirect(this.adminRedirect('/admin/login?error=invalid_oauth_state'));
    }
    try {
      const result = await this.completeGithubLogin.execute(code);
      response.clearCookie('pf_oauth_state', { path: '/' });
      response.cookie('pf_session', result.sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: this.config.cookieSecure,
        maxAge: this.config.sessionTtlSeconds * 1000,
        path: '/',
      });
      const destination = result.principal.accessStatus === 'APPROVED'
        ? '/admin'
        : '/admin/login?status=pending';
      return response.redirect(this.adminRedirect(destination));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'github_login_failed';
      return response.redirect(
        this.adminRedirect(
          `/admin/login?error=${encodeURIComponent(message.slice(0, 120))}`,
        ),
      );
    }
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@Principal() principal: AuthenticatedPrincipal) {
    return { user: principal };
  }

  @Post('logout')
  @UseGuards(SessionGuard)
  async logoutSession(@Req() request: Request, @Res() response: Response) {
    await this.logout.execute(getCookie(request, 'pf_session'));
    response.clearCookie('pf_session', { path: '/' });
    return response.status(204).send();
  }
}
