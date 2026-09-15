import { Injectable } from '@nestjs/common';
import { ExternalServiceError } from '../../../../common/errors/application-error.js';
import type {
  GithubPullRequest,
  GithubPullRequestPage,
  GithubPullRequestPort,
} from '../../application/ports/auth.ports.js';

@Injectable()
export class GithubPullRequestAdapter implements GithubPullRequestPort {
  async list(token: string, username: string, page: number, perPage: number): Promise<GithubPullRequestPage> {
    const search = await fetch(
      `https://api.github.com/search/issues?q=${encodeURIComponent(`author:${username} type:pr`)}&page=${page}&per_page=${perPage + 1}`,
      { headers: this.headers(token) },
    );
    if (!search.ok) throw new ExternalServiceError('GitHub pull request lookup failed');
    const body = (await search.json()) as { items?: Array<{ pull_request?: { url?: string } }> };
    const results = body.items ?? [];
    const hasNextPage = results.length > perPage;
    const items = await Promise.all(
      results.slice(0, perPage).map(async (result) => {
        if (!result.pull_request?.url) throw new ExternalServiceError('GitHub pull request response was invalid');
        const response = await fetch(result.pull_request.url, { headers: this.headers(token) });
        if (!response.ok) throw new ExternalServiceError('GitHub pull request details lookup failed');
        return this.mapPullRequest((await response.json()) as GithubApiPullRequest);
      }),
    );
    return { items, page, perPage, hasNextPage };
  }

  private headers(token: string) {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Project-Forge',
    };
  }

  private mapPullRequest(pr: GithubApiPullRequest): GithubPullRequest {
    return {
      repository: pr.base.repo.full_name,
      number: pr.number,
      title: pr.title,
      state: pr.merged_at ? 'MERGED' : pr.state.toUpperCase() === 'OPEN' ? 'OPEN' : 'CLOSED',
      author: pr.user.login,
      updatedAt: pr.updated_at,
      headBranch: pr.head.ref,
      baseBranch: pr.base.ref,
      url: pr.html_url,
    };
  }
}

type GithubApiPullRequest = {
  number: number;
  title: string;
  state: string;
  merged_at: string | null;
  updated_at: string;
  html_url: string;
  user: { login: string };
  head: { ref: string };
  base: { ref: string; repo: { full_name: string } };
};
