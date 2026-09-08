import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import {
  ChangeUserRoleUseCase,
  ChangeUserNameUseCase,
  ChangeUserStatusUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  RevokeUserSessionsUseCase,
} from './application/use-cases/user.use-cases.js';
import { UsersController } from './presentation/users.controller.js';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [UsersController],
  providers: [
    ListUsersUseCase,
    GetUserUseCase,
    ChangeUserStatusUseCase,
    ChangeUserRoleUseCase,
    ChangeUserNameUseCase,
    RevokeUserSessionsUseCase,
  ],
})
export class UsersModule {}
