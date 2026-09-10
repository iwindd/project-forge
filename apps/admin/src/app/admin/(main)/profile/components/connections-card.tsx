"use client";

import { Alert, Badge, Button, Card, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { getBrowserApiErrorMessage } from "@/lib/api/api";
import { useDisconnectConnectionMutation } from "@/lib/features/profile/profile-api";
import { useProfile } from "./profile-context";

export function ConnectionsCard() {
  const { profile, updateProfile } = useProfile();
  const [disconnectConnection] = useDisconnectConnectionMutation();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const connections = profile.connections ?? [];

  const disconnect = async (id: string) => {
    setPendingId(id);
    setError(null);
    try {
      await disconnectConnection(id).unwrap();
      updateProfile({
        ...profile,
        connections: connections.filter((connection) => connection.id !== id),
      });
    } catch (disconnectError) {
      setError(
        getBrowserApiErrorMessage(
          disconnectError,
          "ไม่สามารถยกเลิกการเชื่อมต่อได้"
        )
      );
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Card>
      <Stack gap="lg">
        <Stack gap={2}>
          <Text fw={600}>บัญชีที่เชื่อมต่อ</Text>
          <Text size="sm" c="dimmed">ใช้ตรวจสอบตัวตนและเข้าสู่ระบบด้วย GitHub</Text>
        </Stack>
        {connections.map((connection) => (
          <Group key={connection.id} justify="space-between" wrap="nowrap">
            <Stack gap={0}>
              <Group gap="xs">
                <Text fw={500}>{connection.provider}</Text>
                <Badge variant="light">เชื่อมต่อแล้ว</Badge>
              </Group>
              <Text size="sm" c="dimmed">
                {connection.username ?? connection.email ?? "ไม่ระบุบัญชี"}
              </Text>
            </Stack>
            <Button
              variant="subtle"
              color="red"
              size="xs"
              onClick={() => void disconnect(connection.id)}
              loading={pendingId === connection.id}
              disabled={connections.length <= 1 || pendingId !== null}
            >
              ยกเลิกการเชื่อมต่อ
            </Button>
          </Group>
        ))}
        {connections.length === 1 ? <Text size="xs" c="dimmed">ต้องมีบัญชีเข้าสู่ระบบอย่างน้อยหนึ่งบัญชี</Text> : null}
        {error ? <Alert color="red">{error}</Alert> : null}
      </Stack>
    </Card>
  );
}
