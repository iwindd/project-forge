import { OptionalProps } from '@mikro-orm/core';
import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'profiles' })
@Unique({ properties: ['userId'] })
export class ProfileOrmEntity {
  [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property({ type: 'uuid', unique: true })
  userId!: string;

  @Property({ type: 'text', nullable: true })
  displayName: string | null = null;

  @Property({ type: 'text', nullable: true })
  avatarUrl: string | null = null;

  @Property({ type: 'text', nullable: true })
  bio: string | null = null;

  @Property({ type: 'text', nullable: true })
  timezone: string | null = null;

  @Property({ type: 'timestamptz' })
  createdAt = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt = new Date();
}
