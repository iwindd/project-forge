import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AuditLog } from '../audit/audit-log.entity.js';
import { ProjectMember, ProjectMemberRole } from './project-member.entity.js';
import { Project, ProjectStatus } from './project.entity.js';
import { AuthService } from '../auth/auth.service.js';

const projectSchema = z.object({
  name: z.string().trim().max(120).optional().default(''),
  githubUrl: z.string().trim().url(),
  sourceBranch: z.string().trim().min(1).max(120).default('main'),
  targetBranch: z.string().trim().min(1).max(120).default('main'),
  nodeVersion: z.string().trim().max(40).optional().default(''),
  environmentMetadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const updateSchema = projectSchema.partial();

@Injectable()
export class ProjectsService {
  constructor(
    private readonly em: EntityManager,
    private readonly auth: AuthService,
  ) {}

  async list(ownerId: string) {
    return this.em.find(Project, { ownerId }, { orderBy: { updatedAt: 'desc' } });
  }

  async get(ownerId: string, id: string) {
    const project = await this.em.findOne(Project, { id, ownerId });
    if (!project) throw new Error('Project was not found');
    return project;
  }

  async create(ownerId: string, body: unknown) {
    const input = projectSchema.parse(body);
    const repository = parseGithubUrl(input.githubUrl);
    if (!repository) throw new Error('Only GitHub HTTPS repository URLs are supported');
    const project = this.em.create(Project, {
      ownerId,
      name: input.name || repository.name,
      githubUrl: repository.url,
      githubOwner: repository.owner,
      githubRepo: repository.name,
      sourceBranch: input.sourceBranch,
      targetBranch: input.targetBranch,
      nodeVersion: input.nodeVersion || null,
      environmentMetadata: Object.keys(input.environmentMetadata).length
        ? maskMetadata(input.environmentMetadata)
        : null,
    });
    this.em.persist(project);
    this.em.persist(
      this.em.create(ProjectMember, { projectId: project.id, userId: ownerId, role: ProjectMemberRole.OWNER }),
    );
    await this.auth.writeAudit({
      actorId: ownerId,
      targetUserId: ownerId,
      action: 'PROJECT_CREATED',
      resourceType: 'PROJECT',
      resourceId: project.id,
      after: { name: project.name, githubUrl: project.githubUrl },
    });
    await this.em.flush();
    return project;
  }

  async update(ownerId: string, id: string, body: unknown) {
    const input = updateSchema.parse(body);
    const project = await this.get(ownerId, id);
    const before = {
      name: project.name,
      sourceBranch: project.sourceBranch,
      targetBranch: project.targetBranch,
      nodeVersion: project.nodeVersion,
    };
    if (input.githubUrl) {
      const repository = parseGithubUrl(input.githubUrl);
      if (!repository) throw new Error('Only GitHub HTTPS repository URLs are supported');
      project.githubUrl = repository.url;
      project.githubOwner = repository.owner;
      project.githubRepo = repository.name;
    }
    if (input.name !== undefined) project.name = input.name || project.githubRepo;
    if (input.sourceBranch !== undefined) project.sourceBranch = input.sourceBranch;
    if (input.targetBranch !== undefined) project.targetBranch = input.targetBranch;
    if (input.nodeVersion !== undefined) project.nodeVersion = input.nodeVersion || null;
    if (input.environmentMetadata !== undefined) project.environmentMetadata = maskMetadata(input.environmentMetadata);
    await this.auth.writeAudit({
      actorId: ownerId,
      targetUserId: ownerId,
      action: 'PROJECT_UPDATED',
      resourceType: 'PROJECT',
      resourceId: project.id,
      before,
      after: {
        name: project.name,
        sourceBranch: project.sourceBranch,
        targetBranch: project.targetBranch,
        nodeVersion: project.nodeVersion,
      },
    });
    await this.em.flush();
    return project;
  }

  async archive(ownerId: string, id: string) {
    const project = await this.get(ownerId, id);
    project.status = ProjectStatus.ARCHIVED;
    project.archivedAt = new Date();
    await this.auth.writeAudit({
      actorId: ownerId,
      targetUserId: ownerId,
      action: 'PROJECT_ARCHIVED',
      resourceType: 'PROJECT',
      resourceId: project.id,
      before: { status: ProjectStatus.ACTIVE },
      after: { status: project.status },
    });
    await this.em.flush();
    return project;
  }
}

function parseGithubUrl(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.hostname.toLowerCase() !== 'github.com' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    const name = parts[1].replace(/\.git$/, '');
    if (!/^[A-Za-z0-9_.-]+$/.test(parts[0]) || !/^[A-Za-z0-9_.-]+$/.test(name)) return null;
    return { owner: parts[0], name, url: `https://github.com/${parts[0]}/${name}` };
  } catch {
    return null;
  }
}

function maskMetadata(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).map(([key]) => [key, 'configured']));
}
