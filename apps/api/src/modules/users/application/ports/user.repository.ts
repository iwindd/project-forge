import type { AccessStatus, UserRecord, UserRole } from '../../domain/user.js';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export type UserListQuery = {
  search?: string;
  status?: AccessStatus;
  role?: UserRole;
  page: number;
  limit: number;
};

export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByGithubUserId(githubUserId: string): Promise<UserRecord | null>;
  list(query: UserListQuery): Promise<{ data: UserRecord[]; total: number }>;
  countActiveAdminsExcluding(userId: string): Promise<number>;
  save(user: UserRecord): Promise<void>;
}

export type UserRoleChange = {
  role: UserRole;
  reason?: string;
};
