import { api } from '@/lib/api/api';
import {
  parseSharedAgentCreation,
  parseSharedAgentOptions,
  parseSharedAgentRoster,
  type CreateSharedAgentRequest,
  type SharedAgentCreation,
  type SharedAgentOptions,
  type SharedAgentRoster,
} from './hermes-agents-schemas';

export const hermesAgentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSharedAgents: builder.query<SharedAgentRoster, void>({
      query: () => 'hermes/agents',
      transformResponse: parseSharedAgentRoster,
      providesTags: ['HermesAgents'],
      keepUnusedDataFor: 300,
    }),
    getSharedAgentOptions: builder.query<SharedAgentOptions, void>({
      query: () => 'hermes/agents/options',
      transformResponse: parseSharedAgentOptions,
      providesTags: ['HermesAgents'],
    }),
    createSharedAgent: builder.mutation<SharedAgentCreation, CreateSharedAgentRequest>({
      query: (body) => ({
        url: 'hermes/agents',
        method: 'POST',
        body,
      }),
      transformResponse: parseSharedAgentCreation,
      invalidatesTags: ['HermesAgents'],
    }),
  }),
  overrideExisting: false,
});

export const { useCreateSharedAgentMutation, useGetSharedAgentOptionsQuery, useGetSharedAgentsQuery } = hermesAgentsApi;
