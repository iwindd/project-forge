import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { GITHUB_ISSUES } from './application/ports/github-issues.port.js';
import { ListGithubIssuesUseCase } from './application/use-cases/list-github-issues-use-case.js';
import { GithubIssuesAdapter } from './infrastructure/github/github-issues.adapter.js';
import { IssuesController } from './presentation/issues.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [IssuesController],
  providers: [{ provide: GITHUB_ISSUES, useClass: GithubIssuesAdapter }, ListGithubIssuesUseCase],
})
export class IssuesModule {}
