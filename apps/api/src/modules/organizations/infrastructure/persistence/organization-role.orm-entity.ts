import { OptionalProps } from '@mikro-orm/core';
import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';
import type { OrganizationMemberRole, OrganizationPermission } from '../../domain/organization.js';

@Entity({ tableName: 'organization_roles' })
@Index({ properties: ['organizationId'] })
@Unique({ properties: ['organizationId', 'name'] })
export class OrganizationRoleOrmEntity {
  [OptionalProps]?: 'id' | 'permissions' | 'isOwner' | 'legacyRole' | 'createdAt' | 'updatedAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property({ type: 'uuid' })
  organizationId!: string;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'json' })
  permissions: OrganizationPermission[] = [];

  @Property({ type: 'boolean' })
  isOwner = false;

  @Property({ type: 'text', nullable: true })
  legacyRole: OrganizationMemberRole | null = null;

  @Property({ type: 'timestamptz' })
  createdAt = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt = new Date();
}
