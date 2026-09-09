import { OptionalProps } from '@mikro-orm/core';
import { Entity, Enum, Index, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';
import { OrganizationInvitationStatus, OrganizationMemberRole } from '../../domain/organization.js';

@Entity({ tableName: 'organization_invitations' })
@Index({ properties: ['organizationId', 'status'] })
@Unique({ properties: ['tokenHash'] })
export class OrganizationInvitationOrmEntity {
  [OptionalProps]?: 'id' | 'roleId' | 'status' | 'acceptedBy' | 'acceptedAt' | 'createdAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property({ type: 'uuid' })
  organizationId!: string;

  @Property({ type: 'uuid' })
  invitedBy!: string;

  @Property({ type: 'text', nullable: true })
  email: string | null = null;

  @Property({ type: 'text', unique: true })
  tokenHash!: string;

  @Enum(() => OrganizationMemberRole)
  role: OrganizationMemberRole = OrganizationMemberRole.MEMBER;

  @Property({ type: 'uuid', nullable: true })
  roleId: string | null = null;

  @Enum(() => OrganizationInvitationStatus)
  status: OrganizationInvitationStatus = OrganizationInvitationStatus.PENDING;

  @Property({ type: 'timestamptz' })
  expiresAt!: Date;

  @Property({ type: 'uuid', nullable: true })
  acceptedBy: string | null = null;

  @Property({ type: 'timestamptz', nullable: true })
  acceptedAt: Date | null = null;

  @Property({ type: 'timestamptz' })
  createdAt = new Date();
}
