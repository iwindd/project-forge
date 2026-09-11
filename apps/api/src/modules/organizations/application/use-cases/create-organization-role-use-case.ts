import { Injectable } from '@nestjs/common';
import type { OrganizationPermission } from '../../domain/organization.js';
import { OrganizationService } from '../organization.service.js';

export type CreateOrganizationRoleInput = {
  name: string;
  permissions: OrganizationPermission[];
};

@Injectable()
export class CreateOrganizationRoleUseCase {
  constructor(private readonly organizations: OrganizationService) {}

  execute(actorId: string, organizationId: string, input: CreateOrganizationRoleInput, options: { requestId?: string } = {}) {
    return this.organizations.createRole(actorId, organizationId, input.name, input.permissions, options);
  }
}
