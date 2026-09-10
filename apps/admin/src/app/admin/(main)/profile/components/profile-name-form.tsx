'use client'

import { useAdminCacheInvalidation } from '@/hooks/use-admin-cache-invalidation'
import { getBrowserApiErrorMessage } from '@/lib/api/api'
import { useUpdateProfileMutation } from '@/lib/features/profile/profile-api'
import { Alert, Button, Group, Stack, TextInput } from '@mantine/core'
import { schemaResolver, useForm } from '@mantine/form'
import { useState } from 'react'
import { z } from 'zod'
import { useProfile } from './profile-context'
import { ProfileEditCard } from './profile-edit-card'

const profileNameFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'กรุณาระบุชื่อผู้ใช้')
    .max(200, 'ชื่อผู้ใช้ต้องไม่เกิน 200 ตัวอักษร')
})

type ProfileNameFormValues = z.infer<typeof profileNameFormSchema>

export function ProfileNameForm() {
  const { profile, updateProfile } = useProfile()
  const { invalidateAdminCaches } = useAdminCacheInvalidation()
  const [updateProfileRequest, { isLoading: pending }] = useUpdateProfileMutation()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<ProfileNameFormValues>({
    initialValues: { name: profile.name },
    validate: schemaResolver(profileNameFormSchema),
    validateInputOnBlur: true
  })

  const save = async (values: ProfileNameFormValues) => {
    setError(null)
    try {
      const result = await updateProfileRequest({ displayName: values.name }).unwrap()
      updateProfile({
        ...profile,
        name: result.profile.displayName,
        updatedAt: result.profile.updatedAt
      })
      form.setValues({ name: result.profile.displayName })
      form.setInitialValues({ name: result.profile.displayName })
      form.resetDirty()
      invalidateAdminCaches({ resources: ['users'] })
    } catch (saveError) {
      setError(
        getBrowserApiErrorMessage(saveError, 'ไม่สามารถบันทึกชื่อได้')
      )
    }
  }

  return (
    <ProfileEditCard title='ชื่อผู้ใช้งาน' description='แก้ไขชื่อที่แสดงในระบบ'>
      <form onSubmit={form.onSubmit(save)}>
        <Stack gap='md'>
          <TextInput label='ชื่อผู้ใช้' maw={400} {...form.getInputProps('name')} />
          <Group>
            <Button
              type='submit'
              loading={pending || form.submitting}
              disabled={!form.isDirty()}
            >
              บันทึก
            </Button>
          </Group>
          {error ? <Alert color='red'>{error}</Alert> : null}
        </Stack>
      </form>
    </ProfileEditCard>
  )
}
