import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../../modules/auth/auth.service.js';
import { getCookie } from '../http.js';
import type { AuthenticatedPrincipal } from './auth.types.js';

export const PRINCIPAL = Symbol('principal');

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { principal?: AuthenticatedPrincipal }>();
    const principal = await this.auth.principalFromToken(getCookie(request, 'pf_session'));
    if (!principal) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Please sign in with GitHub' });
    request.principal = principal;
    return true;
  }
}
