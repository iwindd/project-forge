import { api } from '@/lib/api/api';

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    logout: builder.mutation<null, void>({
      query: () => ({
        url: 'auth/logout',
        method: 'POST',
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useLogoutMutation } = authApi;
