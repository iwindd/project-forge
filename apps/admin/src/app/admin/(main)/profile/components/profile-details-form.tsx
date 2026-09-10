"use client";

import { Alert, Button, Group, Stack, Textarea, TextInput } from "@mantine/core";
import { useState } from "react";
import { getBrowserApiErrorMessage } from "@/lib/api/api";
import { useUpdateProfileMutation } from "@/lib/features/profile/profile-api";
import { ProfileEditCard } from "./profile-edit-card";
import { useProfile } from "./profile-context";

export function ProfileDetailsForm() {
  const { profile, updateProfile } = useProfile();
  const [updateProfileRequest, { isLoading: pending }] = useUpdateProfileMutation();
  const [bio, setBio] = useState(profile.bio ?? "");
  const [timezone, setTimezone] = useState(profile.timezone ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    try {
      const result = await updateProfileRequest({
        bio: bio.trim() || null,
        timezone: timezone.trim() || null,
      }).unwrap();
      updateProfile({
        ...profile,
        bio: result.profile.bio,
        timezone: result.profile.timezone,
        updatedAt: result.profile.updatedAt,
      });
    } catch (saveError) {
      setError(
        getBrowserApiErrorMessage(
          saveError,
          "ไม่สามารถบันทึกข้อมูลโปรไฟล์ได้"
        )
      );
    }
  };

  const unchanged = bio === (profile.bio ?? "") && timezone === (profile.timezone ?? "");

  return (
    <ProfileEditCard title="ข้อมูลโปรไฟล์" description="จัดการข้อมูลเพิ่มเติมที่แสดงในบัญชีของคุณ">
      <Stack gap="md">
        <Textarea label="แนะนำตัว" value={bio} onChange={(event) => setBio(event.currentTarget.value)} maxLength={1000} />
        <TextInput label="เขตเวลา" placeholder="Asia/Bangkok" value={timezone} onChange={(event) => setTimezone(event.currentTarget.value)} maxLength={80} />
        <Group>
          <Button onClick={() => void save()} loading={pending} disabled={unchanged}>
            บันทึก
          </Button>
        </Group>
        {error ? <Alert color="red">{error}</Alert> : null}
      </Stack>
    </ProfileEditCard>
  );
}
