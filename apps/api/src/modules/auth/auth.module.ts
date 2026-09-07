import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AccessRequest } from '../access/access-request.entity.js';
import { AuditLog } from '../audit/audit-log.entity.js';
import { User } from '../users/user.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { OAuthAccount } from './oauth-account.entity.js';
import { Session } from './session.entity.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { ApprovedGuard } from '../../common/auth/approved.guard.js';
import { AdminGuard } from '../../common/auth/admin.guard.js';

@Module({
  imports: [MikroOrmModule.forFeature([User, OAuthAccount, Session, AccessRequest, AuditLog])],
  controllers: [AuthController],
  providers: [AuthService, SessionGuard, ApprovedGuard, AdminGuard],
  exports: [AuthService, SessionGuard, ApprovedGuard, AdminGuard],
})
export class AuthModule {}
