export type GithubIssue = {
  repository: string;
  number: number;
  title: string;
  state: 'open' | 'closed';
  author: string;
  labels: string[];
  assignees: string[];
  updatedAt: string;
  url: string;
};

export type GithubIssuePage = {
  issues: GithubIssue[];
  hasNext: boolean;
};

export const GITHUB_ISSUES = Symbol('GITHUB_ISSUES');

export interface GithubIssuesPort {
  listIssues(accessToken: string, input: { page: number; pageSize: number }): Promise<GithubIssuePage>;
}
