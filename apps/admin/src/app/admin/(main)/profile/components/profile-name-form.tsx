'use client'

import { useAdminCacheInvalidation } from '@/hooks/use-admin-cache-invalidation'
import { getBrowserApiErrorMessage } from '@/lib/api/api'
import { useUpdateProfileMutation } from '@/lib/features/profile/profile-api'
import { Alert, Button, Group, Stack, TextInput } from '@mantine/core'
import { useState } from 'react'
import { useProfile } from './profile-context'
import { ProfileEditCard } from './profile-edit-card'

export function ProfileNameForm() {
  const { profile, updateProfile } = useProfile()
  const { invalidateAdminCaches } = useAdminCacheInvalidation()
  const [updateProfileRequest, { isLoading: pending }] = useUpdateProfileMutation()
  const [name, setName] = useState(profile.name)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setError(null)
    try {
      const result = await updateProfileRequest({ displayName: name }).unwrap()
      updateProfile({
        ...profile,
        name: result.profile.displayName,
        updatedAt: result.profile.updatedAt
      })
      invalidateAdminCaches({ resources: ['users'] })
    } catch (saveError) {
      setError(
        getBrowserApiErrorMessage(saveError, 'ไม่สามารถบันทึกชื่อได้')
      )
    }
  }

  return (
    <ProfileEditCard title='ชื่อผู้ใช้งาน' description='แก้ไขชื่อที่แสดงในระบบ'>
      <Stack gap='md'>
        <TextInput
          label='ชื่อผู้ใช้'
          value={name}
          onChange={event => setName(event.currentTarget.value)}
          maw={400}
        />
        <Group>
          <Button
            onClick={() => void save()}
            loading={pending}
            disabled={!name.trim() || name === profile.name}
          >
            บันทึก
          </Button>
        </Group>
        {error ? <Alert color='red'>{error}</Alert> : null}
      </Stack>
    </ProfileEditCard>
  )
}
