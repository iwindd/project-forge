import { type CanActivate, type ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { getCookie } from '../http/request-context.js';
import { SESSION_AUTHENTICATOR } from './auth.types.js';
import type { AuthenticatedPrincipal, SessionAuthenticator } from './auth.types.js';
import { SECURITY_LOGGER } from '../security/security-log.port.js';
import type { SecurityLogPort } from '../security/security-log.port.js';
import { recordSecurityFailure } from '../security/security-failure.js';

export const PRINCIPAL = Symbol('principal');

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(SESSION_AUTHENTICATOR) private readonly authenticator: SessionAuthenticator,
    @Inject(SECURITY_LOGGER) private readonly security: SecurityLogPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { principal?: AuthenticatedPrincipal }>();
    const principal = await this.authenticator.principalFromToken(getCookie(request, 'pf_session'));
    if (!principal) {
      await recordSecurityFailure(this.security, {
        request,
        event: 'AUTHENTICATION_FAILED',
        code: 'UNAUTHENTICATED',
      });
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Please sign in with GitHub' });
    }
    request.principal = principal;
    return true;
  }
}
