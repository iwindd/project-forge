import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK } from '../../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../../common/database/unit-of-work.port.js';
import { createAccessRequest } from '../../domain/access-request.js';
import { ACCESS_REQUEST_REPOSITORY } from '../ports/access-request.repository.js';
import type { AccessRequestRepository } from '../ports/access-request.repository.js';

export type RequestAccessInput = { reason?: string };

@Injectable()
export class RequestAccessUseCase {
  constructor(
    @Inject(ACCESS_REQUEST_REPOSITORY) private readonly requests: AccessRequestRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  execute(userId: string, input: RequestAccessInput) {
    return this.unitOfWork.run(async () => {
      const existing = await this.requests.findPendingByUserId(userId);
      if (existing) return existing;
      const request = createAccessRequest(userId, input.reason?.trim() || null);
      await this.requests.save(request);
      return request;
    });
  }
}
