import { api } from '@/lib/api/api'
import { organizationListSchema, organizationResponseSchema } from './organization-schemas'
import type { Organization } from './types'

export type UpdateOrganizationInput = {
  organizationId: string
  name: string
}

export function parseUpdateOrganizationResponse(response: unknown) {
  return organizationResponseSchema.parse(response)
}

export const organizationApi = api.injectEndpoints({
  endpoints: builder => ({
    getOrganizations: builder.query<Organization[], void>({
      query: () => 'organizations',
      transformResponse: (response: unknown) =>
        organizationListSchema.parse(response),
      providesTags: ['Organizations']
    }),
    updateOrganization: builder.mutation<
      ReturnType<typeof parseUpdateOrganizationResponse>,
      UpdateOrganizationInput
    >({
      query: ({ organizationId, name }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}`,
        method: 'PATCH',
        body: { name }
      }),
      transformResponse: parseUpdateOrganizationResponse,
      invalidatesTags: ['Organizations']
    })
  }),
  overrideExisting: false
})

export const {
  useGetOrganizationsQuery,
  useUpdateOrganizationMutation
} = organizationApi
