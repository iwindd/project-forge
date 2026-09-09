import { Inject, Injectable } from '@nestjs/common';
import { AccessStatus, UserRole } from '../../domain/user.js';
import { USER_REPOSITORY } from '../ports/user.repository.js';
import type { UserListQuery, UserRepository } from '../ports/user.repository.js';

@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  execute(query: { search?: string; status?: string; role?: string; page?: number; limit?: number }) {
    const limit = Math.min(Math.max(query.limit || 25, 1), 100);
    const page = Math.max(query.page || 1, 1);
    const status =
      query.status && Object.values(AccessStatus).includes(query.status as AccessStatus)
        ? (query.status as AccessStatus)
        : undefined;
    const role = query.role === UserRole.ADMIN || query.role === UserRole.USER ? query.role : undefined;
    const input: UserListQuery = { search: query.search, status, role, page, limit };
    return this.users.list(input).then(({ data, total }) => ({ data, total, page, limit }));
  }
}
