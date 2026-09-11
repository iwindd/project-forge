import { Injectable } from '@nestjs/common';
import { OrganizationService } from '../organization.service.js';

@Injectable()
export class DeleteOrganizationRoleUseCase {
  constructor(private readonly organizations: OrganizationService) {}

  execute(actorId: string, organizationId: string, roleId: string, options: { requestId?: string } = {}) {
    return this.organizations.deleteRole(actorId, organizationId, roleId, options);
  }
}
