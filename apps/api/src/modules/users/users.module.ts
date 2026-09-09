import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ChangeUserNameUseCase } from './application/use-cases/change-user-name-use-case.js';
import { ChangeUserRoleUseCase } from './application/use-cases/change-user-role-use-case.js';
import { ChangeUserStatusUseCase } from './application/use-cases/change-user-status-use-case.js';
import { GetUserUseCase } from './application/use-cases/get-user-use-case.js';
import { ListUsersUseCase } from './application/use-cases/list-users-use-case.js';
import { RevokeUserSessionsUseCase } from './application/use-cases/revoke-user-sessions-use-case.js';
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
