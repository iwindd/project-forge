"use client";

import { ConnectionsCard } from "@/app/admin/(main)/profile/components/connections-card";
import { ProfileDetailsForm } from "@/app/admin/(main)/profile/components/profile-details-form";
import { ProfileNameForm } from "@/app/admin/(main)/profile/components/profile-name-form";
import { useProfile } from "@/app/admin/(main)/profile/components/profile-context";
import { Stack, Text } from "@mantine/core";

export default function AccountSettingsPage() {
  const { profile } = useProfile();

  return (
    <Stack gap="lg">
      <ProfileNameForm />
      <ProfileDetailsForm />
      <ConnectionsCard />
      <Text size="sm" c="dimmed">
        GitHub: {profile.email ?? "เชื่อมต่อผ่านบัญชี GitHub"} · บทบาท: {profile.role}
      </Text>
    </Stack>
  );
}
