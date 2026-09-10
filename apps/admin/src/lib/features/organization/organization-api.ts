import { api } from '@/lib/api/api'
import { z } from 'zod'
import {
  organizationCreatedResponseSchema,
  organizationListSchema,
  organizationResponseSchema
} from './organization-schemas'
import type { Organization } from './types'

export type CreateOrganizationInput = {
  name: string
  slug?: string
}

export type UpdateOrganizationInput = {
  organizationId: string
  name: string
}

export function parseCreateOrganizationResponse(response: unknown) {
  return organizationCreatedResponseSchema.parse(response)
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
    createOrganization: builder.mutation<
      z.infer<typeof organizationCreatedResponseSchema>,
      CreateOrganizationInput
    >({
      query: body => ({
        url: 'organizations',
        method: 'POST',
        body
      }),
      transformResponse: parseCreateOrganizationResponse,
      invalidatesTags: ['Organizations']
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
  useCreateOrganizationMutation,
  useGetOrganizationsQuery,
  useUpdateOrganizationMutation
} = organizationApi
