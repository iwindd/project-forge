import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { getCookie } from '../http/request-context.js';
import { SESSION_AUTHENTICATOR } from './auth.types.js';
import type { AuthenticatedPrincipal, SessionAuthenticator } from './auth.types.js';

export const PRINCIPAL = Symbol('principal');

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(SESSION_AUTHENTICATOR) private readonly authenticator: SessionAuthenticator) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { principal?: AuthenticatedPrincipal }>();
    const principal = await this.authenticator.principalFromToken(getCookie(request, 'pf_session'));
    if (!principal) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Please sign in with GitHub' });
    }
    request.principal = principal;
    return true;
  }
}
