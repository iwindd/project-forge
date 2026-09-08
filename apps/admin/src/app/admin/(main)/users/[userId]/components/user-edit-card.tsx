"use client";

import { Card, Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

type UserEditCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function UserEditCard({
  title,
  description,
  children,
}: UserEditCardProps) {
  return (
    <Card>
      <Group align="flex-start" gap="sm" mb="lg" wrap="nowrap">
        <Stack gap={2}>
          <Text fw={600}>{title}</Text>
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        </Stack>
      </Group>
      {children}
    </Card>
  );
}
