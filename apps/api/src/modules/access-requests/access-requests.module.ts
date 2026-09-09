import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { GetMyAccessRequestsUseCase } from './application/use-cases/get-my-access-requests-use-case.js';
import { ListAccessRequestsUseCase } from './application/use-cases/list-access-requests-use-case.js';
import { RequestAccessUseCase } from './application/use-cases/request-access-use-case.js';
import { ReviewAccessRequestUseCase } from './application/use-cases/review-access-request-use-case.js';
import { AccessRequestsController } from './presentation/access-requests.controller.js';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [AccessRequestsController],
  providers: [GetMyAccessRequestsUseCase, RequestAccessUseCase, ListAccessRequestsUseCase, ReviewAccessRequestUseCase],
})
export class AccessRequestsModule {}
