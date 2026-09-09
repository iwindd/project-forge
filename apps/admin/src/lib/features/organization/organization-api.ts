import { z } from 'zod'
import { api } from '@/lib/api/api'
import { organizationListSchema } from './organization-schemas'
import type { Organization } from './types'

const createOrganizationResponseSchema = z.object({
  organization: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1),
    type: z.enum(['PERSONAL', 'SHARED'])
  })
})

export type CreateOrganizationInput = {
  name: string
  slug?: string
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
      z.infer<typeof createOrganizationResponseSchema>,
      CreateOrganizationInput
    >({
      query: body => ({
        url: 'organizations',
        method: 'POST',
        body
      }),
      transformResponse: (response: unknown) =>
        createOrganizationResponseSchema.parse(response),
      invalidatesTags: ['Organizations']
    })
  }),
  overrideExisting: false
})

export const {
  useCreateOrganizationMutation,
  useGetOrganizationsQuery
} = organizationApi
