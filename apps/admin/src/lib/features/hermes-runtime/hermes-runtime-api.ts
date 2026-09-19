import { api } from '@/lib/api/api';
import { parseHermesRuntimeStatus, type HermesRuntimeStatus } from './hermes-runtime-schemas';

export const hermesRuntimeApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getHermesRuntimeStatus: builder.query<HermesRuntimeStatus, void>({
      query: () => 'hermes/runtime',
      transformResponse: parseHermesRuntimeStatus,
      providesTags: ['HermesRuntime'],
    }),
    connectHermesRuntime: builder.mutation<HermesRuntimeStatus, void>({
      query: () => ({
        url: 'hermes/runtime/connect',
        method: 'POST',
      }),
      transformResponse: parseHermesRuntimeStatus,
      invalidatesTags: ['HermesRuntime'],
    }),
  }),
  overrideExisting: false,
});

export const { useConnectHermesRuntimeMutation, useGetHermesRuntimeStatusQuery } = hermesRuntimeApi;
