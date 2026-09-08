import type { AccessRequestRecord } from '../../domain/access-request.js';

export const ACCESS_REQUEST_REPOSITORY = Symbol('ACCESS_REQUEST_REPOSITORY');

export interface AccessRequestRepository {
  findById(id: string): Promise<AccessRequestRecord | null>;
  findPendingByUserId(userId: string): Promise<AccessRequestRecord | null>;
  findByUserId(userId: string): Promise<AccessRequestRecord[]>;
  findAll(): Promise<AccessRequestRecord[]>;
  save(request: AccessRequestRecord): Promise<void>;
}
