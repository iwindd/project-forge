import { OptionalProps } from '@mikro-orm/core';
import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'oauth_accounts' })
@Unique({ properties: ['provider', 'providerAccountId'] })
export class OAuthAccount {
  [OptionalProps]?: 'id' | 'provider' | 'createdAt' | 'updatedAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property({ type: 'uuid' })
  userId!: string;

  @Property({ type: 'text' })
  provider = 'GITHUB';

  @Property({ type: 'text' })
  providerAccountId!: string;

  @Property({ type: 'text', nullable: true })
  accessTokenCiphertext: string | null = null;

  @Property({ type: 'text', nullable: true })
  scope: string | null = null;

  @Property({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null = null;

  @Property({ type: 'timestamptz' })
  createdAt = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt = new Date();
}
