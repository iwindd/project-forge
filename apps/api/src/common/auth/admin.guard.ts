import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable, Inject } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedPrincipal } from './auth.types.js';
import { SECURITY_LOGGER } from '../security/security-log.port.js';
import type { SecurityLogPort } from '../security/security-log.port.js';
import { recordSecurityFailure } from '../security/security-failure.js';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject(SECURITY_LOGGER) private readonly security: SecurityLogPort) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { principal?: AuthenticatedPrincipal }>();
    if (request.principal?.role !== 'ADMIN' || !request.principal.isActive) {
      await recordSecurityFailure(this.security, {
        request,
        event: 'AUTHORIZATION_FAILED',
        code: 'ADMIN_REQUIRED',
        userId: request.principal?.id ?? null,
      });
      throw new ForbiddenException({ code: 'ADMIN_REQUIRED', message: 'Administrator access is required' });
    }
    return true;
  }
}
