import { OptionalProps } from '@mikro-orm/core';
import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { AccessStatus, UserRole } from '../../domain/user.js';

@Entity({ tableName: 'users' })
export class UserOrmEntity {
  [OptionalProps]?: 'id' | 'name' | 'avatarUrl' | 'role' | 'accessStatus' | 'isActive' | 'createdAt' | 'updatedAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property({ type: 'text', unique: true })
  githubUserId!: string;

  @Property({ type: 'text' })
  githubLogin!: string;

  @Property({ type: 'text', nullable: true })
  name: string | null = null;

  @Property({ type: 'text', nullable: true })
  avatarUrl: string | null = null;

  @Enum(() => UserRole)
  role: UserRole = UserRole.USER;

  @Enum(() => AccessStatus)
  accessStatus: AccessStatus = AccessStatus.PENDING;

  @Property({ type: 'boolean' })
  isActive = true;

  @Property({ type: 'timestamptz' })
  createdAt = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt = new Date();
}
