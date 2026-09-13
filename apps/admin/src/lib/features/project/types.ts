export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';

export type Project = {
  id: string;
  organizationId: string;
  name: string;
  githubUrl: string;
  githubOwner: string;
  githubRepo: string;
  sourceBranch: string;
  targetBranch: string;
  nodeVersion: string | null;
  environmentMetadata: Record<string, string> | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

/** Request body accepted by `POST /organizations/:organizationId/projects`. */
export type CreateProjectInput = {
  organizationId: string;
  name?: string;
  githubUrl: string;
  sourceBranch?: string;
  targetBranch?: string;
  nodeVersion?: string;
  environmentMetadata?: Record<string, string>;
};

/** Request body accepted by `PATCH /organizations/:organizationId/projects/:projectId`. */
export type UpdateProjectInput = {
  organizationId: string;
  projectId: string;
  name?: string;
  githubUrl?: string;
  sourceBranch?: string;
  targetBranch?: string;
  nodeVersion?: string;
  environmentMetadata?: Record<string, string>;
};

export type GetProjectInput = {
  organizationId: string;
  projectId: string;
};

export type ArchiveProjectInput = {
  organizationId: string;
  projectId: string;
  reason?: string;
};

export type RestoreProjectInput = {
  organizationId: string;
  projectId: string;
  reason?: string;
};
