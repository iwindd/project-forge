import { api } from '@/lib/api/api'
import { profileUpdateResponseSchema } from '@/servers/profile/schemas'
import { z } from 'zod'

const profileUpdateInputSchema = z.object({
  displayName: z.string().trim().min(1).max(200).nullable().optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
  timezone: z.string().trim().max(80).nullable().optional()
})

export type ProfileUpdateInput = z.infer<typeof profileUpdateInputSchema>

export const profileApi = api.injectEndpoints({
  endpoints: builder => ({
    updateProfile: builder.mutation<
      z.infer<typeof profileUpdateResponseSchema>,
      ProfileUpdateInput
    >({
      query: input => ({
        url: 'profile',
        method: 'PATCH',
        body: profileUpdateInputSchema.parse(input)
      }),
      transformResponse: (response: unknown) =>
        profileUpdateResponseSchema.parse(response),
      invalidatesTags: ['Profile', 'Users']
    }),
    disconnectConnection: builder.mutation<null, string>({
      query: connectionId => ({
        url: `connections/${encodeURIComponent(connectionId)}`,
        method: 'DELETE'
      }),
      transformResponse: (response: unknown) => z.null().parse(response),
      invalidatesTags: ['Profile']
    })
  }),
  overrideExisting: false
})

export const {
  useDisconnectConnectionMutation,
  useUpdateProfileMutation
} = profileApi
