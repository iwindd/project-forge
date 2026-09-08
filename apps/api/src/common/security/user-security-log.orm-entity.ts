import { OptionalProps } from '@mikro-orm/core';
import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'user_security_logs' })
@Index({ properties: ['userId', 'createdAt'] })
@Index({ properties: ['organizationId', 'createdAt'] })
export class UserSecurityLogOrmEntity {
  [OptionalProps]?: 'id' | 'createdAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property({ type: 'uuid', nullable: true })
  organizationId: string | null = null;

  @Property({ type: 'uuid', nullable: true })
  userId: string | null = null;

  @Property({ type: 'text' })
  event!: string;

  @Property({ type: 'text', nullable: true })
  provider: string | null = null;

  @Property({ type: 'text', nullable: true })
  ipAddress: string | null = null;

  @Property({ type: 'text', nullable: true })
  userAgent: string | null = null;

  @Property({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null = null;

  @Property({ type: 'timestamptz' })
  createdAt = new Date();
}
