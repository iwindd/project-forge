"use client";

import { useAdminCacheInvalidation } from "@/admin/hooks/use-admin-cache-invalidation";
import { Alert, Button, Group, Stack, TextInput } from "@mantine/core";
import { useState } from "react";
import { ProfileEditCard } from "./profile-edit-card";
import { useProfile } from "./profile-context";

const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5050";

export function ProfileNameForm() {
  const { profile, updateProfile } = useProfile();
  const { invalidateAdminCaches } = useAdminCacheInvalidation();
  const [name, setName] = useState(profile.name);
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
        body: JSON.stringify({ displayName: name }),
      });
      if (!response.ok) throw new Error("ไม่สามารถบันทึกชื่อได้");
      const result = (await response.json()) as { profile: { displayName: string; updatedAt: string } };
      updateProfile({ ...profile, name: result.profile.displayName, updatedAt: result.profile.updatedAt });
      invalidateAdminCaches({ resources: ["users"] });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "ไม่สามารถบันทึกชื่อได้");
    } finally {
      setPending(false);
    }
  };

  return (
    <ProfileEditCard title="ชื่อผู้ใช้งาน" description="แก้ไขชื่อที่แสดงในระบบ">
      <Stack gap="md">
        <TextInput label="ชื่อผู้ใช้" value={name} onChange={(event) => setName(event.currentTarget.value)} maw={400} />
        <Group><Button onClick={() => void save()} loading={pending} disabled={!name.trim() || name === profile.name}>บันทึก</Button></Group>
        {error ? <Alert color="red">{error}</Alert> : null}
      </Stack>
    </ProfileEditCard>
  );
}
