import { randomUUID } from 'node:crypto';

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum ProjectMemberRole {
  OWNER = 'OWNER',
  CONTRIBUTOR = 'CONTRIBUTOR',
  VIEWER = 'VIEWER',
}

export type ProjectRecord = {
  id: string;
  ownerId: string;
  name: string;
  githubUrl: string;
  githubOwner: string;
  githubRepo: string;
  sourceBranch: string;
  targetBranch: string;
  nodeVersion: string | null;
  environmentMetadata: Record<string, unknown> | null;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

export type ProjectMemberRecord = {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  createdAt: Date;
  updatedAt: Date;
};

export function createProject(input: {
  ownerId: string;
  name: string;
  githubUrl: string;
  githubOwner: string;
  githubRepo: string;
  sourceBranch: string;
  targetBranch: string;
  nodeVersion: string | null;
  environmentMetadata: Record<string, unknown> | null;
}): ProjectRecord {
  const now = new Date();
  return {
    id: randomUUID(),
    ...input,
    status: ProjectStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
}

export function createOwnerMember(projectId: string, userId: string): ProjectMemberRecord {
  const now = new Date();
  return {
    id: randomUUID(),
    projectId,
    userId,
    role: ProjectMemberRole.OWNER,
    createdAt: now,
    updatedAt: now,
  };
}

export function parseGithubRepositoryUrl(value: string): {
  owner: string;
  name: string;
  url: string;
} | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.hostname.toLowerCase() !== 'github.com' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    const name = parts[1].replace(/\.git$/, '');
    if (!/^[A-Za-z0-9_.-]+$/.test(parts[0]) || !/^[A-Za-z0-9_.-]+$/.test(name)) return null;
    return { owner: parts[0], name, url: `https://github.com/${parts[0]}/${name}` };
  } catch {
    return null;
  }
}

export function maskEnvironmentMetadata(value: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.entries(value).map(([key]) => [key, 'configured']));
}
