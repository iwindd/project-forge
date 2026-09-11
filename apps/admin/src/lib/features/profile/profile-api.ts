import { api } from '@/lib/api/api'
import {
  profileResponseSchema,
  profileUpdateResponseSchema
} from '@/servers/profile/schemas'
import type { Profile } from '@/servers/profile/types'
import { z } from 'zod'

const profileUpdateInputSchema = z.object({
  displayName: z.string().trim().min(1).max(200).nullable().optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
  timezone: z.string().trim().max(80).nullable().optional()
})

export type ProfileUpdateInput = z.infer<typeof profileUpdateInputSchema>

export const profileApi = api.injectEndpoints({
  endpoints: builder => ({
    getProfile: builder.query<Profile, void>({
      query: () => 'profile',
      transformResponse: (response: unknown) => {
        const result = profileResponseSchema.parse(response)
        return {
          id: result.profile.id,
          name: result.profile.displayName,
          email:
            result.connections.find(connection => connection.provider === 'GITHUB')?.email ?? null,
          role: result.profile.platformRole === 'ADMIN' ? 'ADMIN' : 'EDITOR',
          createdAt: result.profile.createdAt,
          updatedAt: result.profile.updatedAt,
          avatarUrl: result.profile.avatarUrl,
          bio: result.profile.bio,
          timezone: result.profile.timezone,
          connections: result.connections
        }
      },
      providesTags: ['Profile']
    }),
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
  useGetProfileQuery,
  useDisconnectConnectionMutation,
  useUpdateProfileMutation
} = profileApi
