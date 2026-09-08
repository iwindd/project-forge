import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { UserListQuery, UserListResult } from "@/servers/user/types";
import { addOrganizationHeader, getActiveOrganizationId } from "../organization/organization-context";

type ApiUserListResult = Omit<UserListResult, "data"> & {
  data: Array<Omit<UserListResult["data"][number], "role"> & { role: "ADMIN" | "EDITOR" | "OWNER" | "MEMBER" }>;
};

export const usersApi = createApi({
  reducerPath: "usersApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5050"}/api/v1/`,
    credentials: "include",
    cache: "no-store",
    prepareHeaders: (headers) => addOrganizationHeader(headers),
  }),
  tagTypes: ["Users"],
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getUsers: builder.query<UserListResult, UserListQuery>({
      query: (params) => ({
        url: getActiveOrganizationId()
          ? `organizations/${getActiveOrganizationId()}/members`
          : "admin/users",
        params,
      }),
      transformResponse: (response: ApiUserListResult) => ({
        ...response,
        data: response.data.map((user) => ({
          ...user,
          role: user.role === "ADMIN" || user.role === "OWNER" ? "ADMIN" : "EDITOR",
        })),
      }),
      providesTags: ["Users"],
    }),
  }),
});

export const { useGetUsersQuery } = usersApi;
