import { OptionalProps } from '@mikro-orm/core';
import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'connections' })
@Index({ properties: ['userId'] })
@Unique({ properties: ['provider', 'providerAccountId'] })
@Unique({ properties: ['userId', 'provider'] })
export class ConnectionOrmEntity {
  [OptionalProps]?: 'id' | 'providerEmailVerified' | 'providerVerifiedEmails' | 'connectedAt' | 'updatedAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property({ type: 'uuid' })
  userId!: string;

  @Property({ type: 'text' })
  provider!: string;

  @Property({ type: 'text' })
  providerAccountId!: string;

  @Property({ type: 'text', nullable: true })
  providerUsername: string | null = null;

  @Property({ type: 'text', nullable: true })
  providerEmail: string | null = null;

  @Property({ type: 'boolean' })
  providerEmailVerified = false;

  @Property({ type: 'json' })
  providerVerifiedEmails: string[] = [];

  @Property({ type: 'text', nullable: true })
  accessTokenCiphertext: string | null = null;

  @Property({ type: 'text', nullable: true })
  scopes: string | null = null;

  @Property({ type: 'timestamptz' })
  connectedAt = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt = new Date();
}
