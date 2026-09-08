import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedPrincipal } from './auth.types.js';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { principal?: AuthenticatedPrincipal }>();
    if (request.principal?.role !== 'ADMIN' || !request.principal.isActive) {
      throw new ForbiddenException({ code: 'ADMIN_REQUIRED', message: 'Administrator access is required' });
    }
    return true;
  }
}
