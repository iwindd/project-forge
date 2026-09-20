import { api } from '@/lib/api/api';
import {
  parseHermesSessionList,
  parseHermesSessionResponse,
  type HermesSessionResponse,
  type HermesSessionSummary,
} from './hermes-sessions-schemas';

export const hermesSessionsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getHermesSessions: builder.query<HermesSessionSummary[], void>({
      query: () => 'hermes/sessions',
      transformResponse: (response: unknown) => parseHermesSessionList(response).sessions,
      providesTags: ['HermesSessions'],
    }),
    createHermesSession: builder.mutation<HermesSessionResponse, { agentHandle: string }>({
      query: (body) => ({
        url: 'hermes/sessions',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) => parseHermesSessionResponse(response),
      invalidatesTags: ['HermesSessions'],
    }),
    resumeHermesSession: builder.mutation<HermesSessionResponse, string>({
      query: (sessionId) => ({
        url: `hermes/sessions/${sessionId}/resume`,
        method: 'POST',
      }),
      transformResponse: (response: unknown) => parseHermesSessionResponse(response),
      invalidatesTags: ['HermesSessions'],
    }),
    renameHermesSession: builder.mutation<void, { sessionId: string; title: string }>({
      query: ({ sessionId, title }) => ({
        url: `hermes/sessions/${sessionId}`,
        method: 'PATCH',
        body: { title },
      }),
      invalidatesTags: ['HermesSessions'],
    }),
    closeHermesSession: builder.mutation<void, string>({
      query: (sessionId) => ({
        url: `hermes/sessions/${sessionId}/close`,
        method: 'POST',
      }),
      invalidatesTags: ['HermesSessions'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetHermesSessionsQuery,
  useCreateHermesSessionMutation,
  useResumeHermesSessionMutation,
  useRenameHermesSessionMutation,
  useCloseHermesSessionMutation,
} = hermesSessionsApi;
