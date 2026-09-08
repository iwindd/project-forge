"use client";

import { Alert, Button, Group, Stack, Textarea, TextInput } from "@mantine/core";
import { useState } from "react";
import { ProfileEditCard } from "./profile-edit-card";
import { useProfile } from "./profile-context";

const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5050";

export function ProfileDetailsForm() {
  const { profile, updateProfile } = useProfile();
  const [bio, setBio] = useState(profile.bio ?? "");
  const [timezone, setTimezone] = useState(profile.timezone ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`${apiOrigin}/api/v1/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bio: bio.trim() || null,
          timezone: timezone.trim() || null,
        }),
      });
      if (!response.ok) throw new Error("ไม่สามารถบันทึกข้อมูลโปรไฟล์ได้");
      const result = (await response.json()) as {
        profile: { bio: string | null; timezone: string | null; updatedAt: string };
      };
      updateProfile({
        ...profile,
        bio: result.profile.bio,
        timezone: result.profile.timezone,
        updatedAt: result.profile.updatedAt,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "ไม่สามารถบันทึกข้อมูลโปรไฟล์ได้");
    } finally {
      setPending(false);
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
