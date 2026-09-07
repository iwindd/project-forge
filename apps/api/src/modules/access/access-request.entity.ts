import { OptionalProps } from '@mikro-orm/core';
import { Entity, Enum, Index, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

export enum AccessRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity({ tableName: 'access_requests' })
@Index({ properties: ['userId', 'status'] })
export class AccessRequest {
  [OptionalProps]?: 'id' | 'status' | 'createdAt' | 'updatedAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property({ type: 'uuid' })
  userId!: string;

  @Property({ type: 'text', nullable: true })
  reason: string | null = null;

  @Enum(() => AccessRequestStatus)
  status: AccessRequestStatus = AccessRequestStatus.PENDING;

  @Property({ type: 'uuid', nullable: true })
  reviewedBy: string | null = null;

  @Property({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null = null;

  @Property({ type: 'text', nullable: true })
  reviewNote: string | null = null;

  @Property({ type: 'timestamptz' })
  createdAt = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt = new Date();
}
