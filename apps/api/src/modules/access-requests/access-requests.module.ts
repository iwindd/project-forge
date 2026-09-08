import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import {
  GetMyAccessRequestsUseCase,
  ListAccessRequestsUseCase,
  RequestAccessUseCase,
  ReviewAccessRequestUseCase,
} from './application/use-cases/access-request.use-cases.js';
import { AccessRequestsController } from './presentation/access-requests.controller.js';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [AccessRequestsController],
  providers: [GetMyAccessRequestsUseCase, RequestAccessUseCase, ListAccessRequestsUseCase, ReviewAccessRequestUseCase],
})
export class AccessRequestsModule {}
