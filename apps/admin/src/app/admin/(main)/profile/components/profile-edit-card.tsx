"use client";

import { Card, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

export function ProfileEditCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <Stack gap="lg">
        <Stack gap={2}>
          <Text fw={600}>{title}</Text>
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        </Stack>
        {children}
      </Stack>
    </Card>
  );
}
