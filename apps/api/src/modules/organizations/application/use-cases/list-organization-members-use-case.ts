import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import {
  ORGANIZATION_MEMBER_QUERY,
} from '../ports/organization-member.query.js';
import type {
  OrganizationMemberQuery,
  OrganizationMemberQueryRecord,
} from '../ports/organization-member.query.js';

type OrganizationMember = OrganizationMemberQueryRecord;

export type ListOrganizationMembersQuery = {
  search?: string;
  roleId?: string;
  status?: 'active' | 'inactive';
  page: number;
  pageSize: number;
  sortBy?: 'name' | 'role' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
};

export type ListOrganizationMembersResult = {
  data: OrganizationMember[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

@Injectable()
export class ListOrganizationMembersUseCase {
  constructor(
    @Inject(ORGANIZATION_MEMBER_QUERY)
    private readonly members: OrganizationMemberQuery,
  ) {}

  async execute(
    userId: string,
    organizationId: string,
    query: ListOrganizationMembersQuery,
  ): Promise<ListOrganizationMembersResult> {
    let data = await this.members.list(userId, organizationId);
    const search = query.search?.trim().toLowerCase();

    if (search) {
      data = data.filter((member) =>
        `${member.name} ${member.email ?? ''}`.toLowerCase().includes(search),
      );
    }

    if (query.roleId && query.roleId !== 'all') {
      data = data.filter((member) => member.role.id === query.roleId);
    }

    if (query.status === 'active') data = data.filter((member) => member.isActive);
    if (query.status === 'inactive') data = data.filter((member) => !member.isActive);

    const direction = query.sortDirection === 'asc' ? 1 : -1;
    const sortBy = query.sortBy ?? 'createdAt';
    data.sort((a, b) => {
      const aValue = sortBy === 'role' ? a.role.name : a[sortBy];
      const bValue = sortBy === 'role' ? b.role.name : b[sortBy];
      return String(aValue ?? '').localeCompare(String(bValue ?? '')) * direction;
    });

    const total = data.length;
    return {
      data: data.slice(
        (query.page - 1) * query.pageSize,
        query.page * query.pageSize,
      ),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }
}
