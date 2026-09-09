import { z } from 'zod'
import { api } from '@/lib/api/api'
import type { Organization } from './types'

const organizationRoleSchema = z.object({
  id: z.string().nullable(),
  name: z.string().min(1),
  permissions: z.array(z.string()),
  isOwner: z.boolean(),
  legacyRole: z.enum(['OWNER', 'ADMIN', 'MEMBER']).nullable()
})

const organizationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  type: z.enum(['PERSONAL', 'SHARED']),
  role: organizationRoleSchema,
  status: z.enum(['ACTIVE', 'ARCHIVED', 'SUSPENDED']),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
}) satisfies z.ZodType<Organization>

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
        z.array(organizationSchema).parse(response),
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
