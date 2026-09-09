import { Injectable } from '@nestjs/common';
import { OrganizationService } from '../organization.service.js';

@Injectable()
export class ListOrganizationRolesUseCase {
  constructor(private readonly organizations: OrganizationService) {}

  execute(actorId: string, organizationId: string) {
    return this.organizations.listRoles(actorId, organizationId);
  }
}
