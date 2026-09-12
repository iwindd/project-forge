import { OptionalProps } from '@mikro-orm/core';
import { Entity, Enum, Index, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';
import { OrganizationStatus, OrganizationType } from '../../domain/organization.js';

@Entity({ tableName: 'organizations' })
@Index({ properties: ['status'] })
@Unique({ properties: ['slug'] })
export class OrganizationOrmEntity {
  [OptionalProps]?: 'id' | 'status' | 'createdAt' | 'updatedAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text', unique: true })
  slug!: string;

  @Enum(() => OrganizationType)
  type: OrganizationType = OrganizationType.SHARED;

  @Enum(() => OrganizationStatus)
  status: OrganizationStatus = OrganizationStatus.ACTIVE;

  @Property({ type: 'timestamptz' })
  createdAt = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt = new Date();
}
