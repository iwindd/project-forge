"use client";

import { Button, Stack } from "@mantine/core";
import { IconBrandGithub } from "@tabler/icons-react";

const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5050";

export function LoginForm() {
  return (
    <Stack gap="md">
      <Button
        component="a"
        href={`${apiOrigin}/api/v1/auth/github/start`}
        fullWidth
        size="md"
        mt="sm"
        leftSection={<IconBrandGithub size={18} />}
      >
        เข้าสู่ระบบด้วย GitHub
      </Button>
    </Stack>
  );
}
