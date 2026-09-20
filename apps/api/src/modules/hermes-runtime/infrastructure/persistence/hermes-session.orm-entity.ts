import { OptionalProps } from '@mikro-orm/core';
import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'hermes_sessions' })
@Index({ properties: ['userId', 'updatedAt'] })
@Unique({ properties: ['agentHandle', 'hermesSessionId'] })
export class HermesSessionOrmEntity {
  [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt' | 'closedAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property({ type: 'uuid' })
  userId!: string;

  @Property({ type: 'text' })
  agentHandle!: string;

  @Property({ type: 'text' })
  hermesSessionId!: string;

  @Property({ type: 'timestamptz', nullable: true })
  closedAt: Date | null = null;

  @Property({ type: 'timestamptz' })
  createdAt = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt = new Date();
}
