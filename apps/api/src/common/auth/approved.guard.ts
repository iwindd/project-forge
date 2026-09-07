import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AccessStatus } from '../../modules/users/user.entity.js';
import type { AuthenticatedPrincipal } from './auth.types.js';

@Injectable()
export class ApprovedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { principal?: AuthenticatedPrincipal }>();
    if (request.principal?.accessStatus !== AccessStatus.APPROVED) {
      throw new ForbiddenException({ code: 'ACCESS_PENDING', message: 'Your account has not been approved' });
    }
    return true;
  }
}
