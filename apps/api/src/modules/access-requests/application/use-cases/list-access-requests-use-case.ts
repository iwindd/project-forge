import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../users/application/ports/user.repository.js';
import type { UserRepository } from '../../../users/application/ports/user.repository.js';
import { ACCESS_REQUEST_REPOSITORY } from '../ports/access-request.repository.js';
import type { AccessRequestRepository } from '../ports/access-request.repository.js';

@Injectable()
export class ListAccessRequestsUseCase {
  constructor(
    @Inject(ACCESS_REQUEST_REPOSITORY) private readonly requests: AccessRequestRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute() {
    const requests = await this.requests.findAll();
    const users = await Promise.all(requests.map((request) => this.users.findById(request.userId)));
    return requests.map((request, index) => ({ request, user: users[index] ?? null }));
  }
}
