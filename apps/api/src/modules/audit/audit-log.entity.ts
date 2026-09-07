import { OptionalProps } from '@mikro-orm/core';
import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'audit_logs' })
@Index({ properties: ['createdAt'] })
@Index({ properties: ['targetUserId'] })
export class AuditLog {
  [OptionalProps]?: 'id' | 'createdAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property({ type: 'uuid', nullable: true })
  actorId: string | null = null;

  @Property({ type: 'uuid', nullable: true })
  targetUserId: string | null = null;

  @Property({ type: 'text' })
  action!: string;

  @Property({ type: 'text' })
  resourceType!: string;

  @Property({ type: 'text', nullable: true })
  resourceId: string | null = null;

  @Property({ type: 'json', nullable: true })
  beforeJson: Record<string, unknown> | null = null;

  @Property({ type: 'json', nullable: true })
  afterJson: Record<string, unknown> | null = null;

  @Property({ type: 'text', nullable: true })
  reason: string | null = null;

  @Property({ type: 'text', nullable: true })
  requestId: string | null = null;

  @Property({ type: 'timestamptz' })
  createdAt = new Date();
}
