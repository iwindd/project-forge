import { OptionalProps } from '@mikro-orm/core';
import { Entity, Enum, Index, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';
import { ProjectStatus } from '../../domain/project.js';

@Entity({ tableName: 'projects' })
@Index({ properties: ['organizationId', 'status'] })
@Unique({ properties: ['organizationId', 'githubUrl'] })
export class ProjectOrmEntity {
  [OptionalProps]?:
    | 'id'
    | 'sourceBranch'
    | 'targetBranch'
    | 'nodeVersion'
    | 'environmentMetadata'
    | 'status'
    | 'createdAt'
    | 'updatedAt'
    | 'archivedAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property({ type: 'uuid' })
  organizationId!: string;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text' })
  githubUrl!: string;

  @Property({ type: 'text' })
  githubOwner!: string;

  @Property({ type: 'text' })
  githubRepo!: string;

  @Property({ type: 'text' })
  sourceBranch = 'main';

  @Property({ type: 'text' })
  targetBranch = 'main';

  @Property({ type: 'text', nullable: true })
  nodeVersion: string | null = null;

  @Property({ type: 'json', nullable: true })
  environmentMetadata: Record<string, unknown> | null = null;

  @Enum(() => ProjectStatus)
  status: ProjectStatus = ProjectStatus.ACTIVE;

  @Property({ type: 'timestamptz' })
  createdAt = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt = new Date();

  @Property({ type: 'timestamptz', nullable: true })
  archivedAt: Date | null = null;
}
