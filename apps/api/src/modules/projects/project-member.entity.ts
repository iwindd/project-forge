import { OptionalProps } from '@mikro-orm/core';
import { Entity, Enum, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';

export enum ProjectMemberRole {
  OWNER = 'OWNER',
  CONTRIBUTOR = 'CONTRIBUTOR',
  VIEWER = 'VIEWER',
}

@Entity({ tableName: 'project_members' })
@Unique({ properties: ['projectId', 'userId'] })
export class ProjectMember {
  [OptionalProps]?: 'id' | 'role' | 'createdAt' | 'updatedAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property({ type: 'uuid' })
  projectId!: string;

  @Property({ type: 'uuid' })
  userId!: string;

  @Enum(() => ProjectMemberRole)
  role: ProjectMemberRole = ProjectMemberRole.OWNER;

  @Property({ type: 'timestamptz' })
  createdAt = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt = new Date();
}
