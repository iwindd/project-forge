"use client";

import { ConnectionsCard } from "@/app/admin/(main)/profile/components/connections-card";
import { ProfileDetailsForm } from "@/app/admin/(main)/profile/components/profile-details-form";
import { ProfileNameForm } from "@/app/admin/(main)/profile/components/profile-name-form";
import { useProfile } from "@/app/admin/(main)/profile/components/profile-context";
import { Alert, Button, Loader, Stack, Text } from "@mantine/core";

export default function AccountSettingsPage() {
  const { profile, isLoading, isError, retry } = useProfile();

  return (
    <Stack gap="lg">
      {isLoading ? <Loader size="sm" aria-label="กำลังโหลดโปรไฟล์" /> : null}
      {isError ? (
        <Alert color="red" title="ไม่สามารถโหลดข้อมูลโปรไฟล์ได้">
          <Button variant="light" size="xs" mt="sm" onClick={retry}>
            ลองใหม่
          </Button>
        </Alert>
      ) : null}
      <ProfileNameForm />
      <ProfileDetailsForm />
      <ConnectionsCard />
      <Text size="sm" c="dimmed">
        GitHub: {profile.email ?? "เชื่อมต่อผ่านบัญชี GitHub"} · บทบาท: {profile.role}
      </Text>
    </Stack>
  );
}
