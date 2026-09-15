import { Injectable } from '@nestjs/common';
import { ExternalServiceError } from '../../../../common/errors/application-error.js';
import type { GithubIssue, GithubIssuePage, GithubIssuesPort } from '../../application/ports/github-issues.port.js';

@Injectable()
export class GithubIssuesAdapter implements GithubIssuesPort {
  async listIssues(accessToken: string, input: { page: number; pageSize: number }): Promise<GithubIssuePage> {
    const url = new URL('https://api.github.com/issues');
    url.searchParams.set('filter', 'all');
    url.searchParams.set('state', 'all');
    url.searchParams.set('sort', 'updated');
    url.searchParams.set('direction', 'desc');
    url.searchParams.set('per_page', String(input.pageSize));
    url.searchParams.set('page', String(input.page));

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${accessToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Project-Forge',
        },
      });
    } catch {
      throw new ExternalServiceError('GitHub issues lookup failed');
    }
    if (!response.ok) throw new ExternalServiceError('GitHub issues lookup failed', { status: response.status });

    const body = (await response.json()) as Array<Record<string, unknown>>;
    const issues = body
      .filter((issue) => !issue.pull_request)
      .map((issue): GithubIssue => {
        const repository = issue.repository as Record<string, unknown> | undefined;
        const user = issue.user as Record<string, unknown> | undefined;
        const labels = Array.isArray(issue.labels) ? issue.labels : [];
        const assignees = Array.isArray(issue.assignees) ? issue.assignees : [];
        return {
          repository: typeof repository?.full_name === 'string' ? repository.full_name : 'unknown',
          number: typeof issue.number === 'number' ? issue.number : 0,
          title: typeof issue.title === 'string' ? issue.title : '',
          state: issue.state === 'closed' ? 'closed' : 'open',
          author: typeof user?.login === 'string' ? user.login : 'unknown',
          labels: labels.flatMap((label) => {
            const name = typeof label === 'object' && label !== null ? (label as Record<string, unknown>).name : null;
            return typeof name === 'string' ? [name] : [];
          }),
          assignees: assignees.flatMap((assignee) => {
            const login =
              typeof assignee === 'object' && assignee !== null ? (assignee as Record<string, unknown>).login : null;
            return typeof login === 'string' ? [login] : [];
          }),
          updatedAt: typeof issue.updated_at === 'string' ? issue.updated_at : '',
          url: typeof issue.html_url === 'string' ? issue.html_url : '',
        };
      });

    return { issues, hasNext: /<[^>]+>;\s*rel="next"/.test(response.headers.get('link') ?? '') };
  }
}
