import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ConnectionOrmEntity } from '../auth/infrastructure/persistence/connection.orm-entity.js';
import { PullRequestsController } from './presentation/pull-requests.controller.js';
import { ListConnectedPullRequestsUseCase } from './application/use-cases/list-connected-pull-requests-use-case.js';
import { GITHUB_PULL_REQUESTS } from '../auth/application/ports/auth.ports.js';
import { GithubPullRequestAdapter } from '../auth/infrastructure/github/github-pull-request.adapter.js';

@Module({
  imports: [AuthModule, MikroOrmModule.forFeature([ConnectionOrmEntity])],
  controllers: [PullRequestsController],
  providers: [ListConnectedPullRequestsUseCase, { provide: GITHUB_PULL_REQUESTS, useClass: GithubPullRequestAdapter }],
})
export class PullRequestsModule {}