"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useState } from "react";
import { getActiveOrganizationId } from "@/lib/features/organization/organization-context";
import { useUser } from "@/app/admin/(main)/users/[userId]/components/user-context";

const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5050";

export default function UserProfilePage() {
  const { user, updateUser } = useUser();
  const [name, setName] = useState(user.name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (path: string, body: Record<string, unknown>) => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`${apiOrigin}/api/v1/${path}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("ไม่สามารถบันทึกข้อมูลได้");
      const result = (await response.json()) as { user: typeof user };
      updateUser({
        ...user,
        ...result.user,
        role: result.user.role === "ADMIN" ? "ADMIN" : "EDITOR",
        email: result.user.email ?? user.email,
      });
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "ไม่สามารถบันทึกข้อมูลได้",
      );
    } finally {
      setPending(false);
    }
  };

  const organizationId = getActiveOrganizationId();

  return (
    <Stack gap="lg">
      <Card withBorder>
        <Stack>
          <Text fw={600}>ข้อมูลผู้ใช้งาน</Text>
          <TextInput label="GitHub" value={user.email} readOnly />
          <TextInput
            label="ชื่อ"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <Button
            w="fit-content"
            onClick={() =>
              organizationId &&
              void update(`organizations/${organizationId}/members/${user.id}/name`, {
                name,
              })
            }
            loading={pending}
            disabled={!organizationId || !name.trim() || name === user.name}
          >
            บันทึกชื่อ
          </Button>
        </Stack>
      </Card>
      <Card withBorder>
        <Stack>
          <Text fw={600}>บทบาทและสถานะ</Text>
          <Select
            label="บทบาท"
            value={user.role}
            data={[
              { value: "ADMIN", label: "ผู้ดูแล Organization" },
              { value: "EDITOR", label: "สมาชิก" },
            ]}
            onChange={(value) =>
              value &&
              organizationId &&
              void update(`organizations/${organizationId}/members/${user.id}`, {
                role: value === "ADMIN" ? "ADMIN" : "MEMBER",
              })
            }
            disabled={pending || !organizationId}
          />
          <Group>
            <Badge color={user.isActive ? "green" : "red"}>
              {user.isActive ? "เปิดใช้งาน" : "ระงับการใช้งาน"}
            </Badge>
            <Button
              color={user.isActive ? "red" : "green"}
              variant="light"
              onClick={() =>
                organizationId &&
                void update(`organizations/${organizationId}/members/${user.id}/status`, {
                  active: !user.isActive,
                })
              }
              loading={pending}
              disabled={!organizationId}
            >
              {user.isActive ? "ระงับผู้ใช้งาน" : "เปิดใช้งาน"}
            </Button>
          </Group>
        </Stack>
      </Card>
      {error ? <Alert color="red">{error}</Alert> : null}
    </Stack>
  );
}
