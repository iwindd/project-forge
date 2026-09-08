import { OptionalProps } from '@mikro-orm/core';
import { Entity, Enum, Index, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';
import { OrganizationMemberRole, OrganizationMemberStatus } from '../../domain/organization.js';

@Entity({ tableName: 'organization_members' })
@Index({ properties: ['organizationId', 'status'] })
@Index({ properties: ['userId', 'status'] })
@Unique({ properties: ['organizationId', 'userId'] })
export class OrganizationMemberOrmEntity {
  [OptionalProps]?: 'id' | 'status' | 'joinedAt' | 'updatedAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property({ type: 'uuid' })
  organizationId!: string;

  @Property({ type: 'uuid' })
  userId!: string;

  @Enum(() => OrganizationMemberRole)
  role: OrganizationMemberRole = OrganizationMemberRole.MEMBER;

  @Enum(() => OrganizationMemberStatus)
  status: OrganizationMemberStatus = OrganizationMemberStatus.ACTIVE;

  @Property({ type: 'timestamptz' })
  joinedAt = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt = new Date();
}
