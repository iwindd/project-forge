import { Inject, Injectable } from '@nestjs/common';
import { ACCESS_REQUEST_REPOSITORY } from '../ports/access-request.repository.js';
import type { AccessRequestRepository } from '../ports/access-request.repository.js';

@Injectable()
export class GetMyAccessRequestsUseCase {
  constructor(@Inject(ACCESS_REQUEST_REPOSITORY) private readonly requests: AccessRequestRepository) {}

  execute(userId: string) {
    return this.requests.findByUserId(userId);
  }
}
