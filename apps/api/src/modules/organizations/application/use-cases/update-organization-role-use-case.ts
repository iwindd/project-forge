import { Injectable } from '@nestjs/common';
import type { OrganizationPermission } from '../../domain/organization.js';
import { OrganizationService } from '../organization.service.js';

export type UpdateOrganizationRoleInput = {
  name?: string;
  permissions?: OrganizationPermission[];
};

@Injectable()
export class UpdateOrganizationRoleUseCase {
  constructor(private readonly organizations: OrganizationService) {}

  execute(
    actorId: string,
    organizationId: string,
    roleId: string,
    input: UpdateOrganizationRoleInput,
  ) {
    return this.organizations.updateRole(actorId, organizationId, roleId, input);
  }
}
