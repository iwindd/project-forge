export type UserListQuery = {
  page: number;
  pageSize: number;
  search: string;
  role?: "ADMIN" | "EDITOR";
  status: "all" | "active" | "inactive";
  sortBy: "name" | "email" | "role" | "isActive" | "createdAt";
  sortDirection: "asc" | "desc";
};

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EDITOR";
  isActive: boolean;
  createdAt: string;
};

export type UserDetail = UserListItem & { updatedAt: string };
export type UserListResult = { data: UserListItem[]; total: number };
