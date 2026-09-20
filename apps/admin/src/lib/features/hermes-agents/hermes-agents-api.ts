import { api } from '@/lib/api/api';
import { parseSharedAgentRoster, type SharedAgentRoster } from './hermes-agents-schemas';

export const hermesAgentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSharedAgents: builder.query<SharedAgentRoster, void>({
      query: () => 'hermes/agents',
      transformResponse: parseSharedAgentRoster,
      providesTags: ['HermesAgents'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetSharedAgentsQuery } = hermesAgentsApi;
