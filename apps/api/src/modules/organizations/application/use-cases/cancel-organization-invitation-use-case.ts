import { Injectable } from '@nestjs/common';
import { OrganizationService } from '../organization.service.js';

@Injectable()
export class CancelOrganizationInvitationUseCase {
  constructor(private readonly organizations: OrganizationService) {}

  execute(actorId: string, organizationId: string, invitationId: string, options: { requestId?: string } = {}) {
    return this.organizations.cancelInvitation(actorId, organizationId, invitationId, options);
  }
}
