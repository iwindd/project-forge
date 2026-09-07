import { OptionalProps } from '@mikro-orm/core';
import { Entity, PrimaryKey, Property, Index } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'sessions' })
@Index({ properties: ['tokenHash'] })
export class Session {
  [OptionalProps]?: 'id' | 'revokedAt' | 'createdAt' | 'lastSeenAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property({ type: 'uuid' })
  userId!: string;

  @Property({ type: 'text', unique: true })
  tokenHash!: string;

  @Property({ type: 'timestamptz' })
  expiresAt!: Date;

  @Property({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null = null;

  @Property({ type: 'timestamptz' })
  createdAt = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  lastSeenAt = new Date();
}
