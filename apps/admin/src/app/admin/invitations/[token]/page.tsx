"use client";

import { Alert, Button, Card, Stack, Text, Title } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5050";

export default function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState("กำลังตรวจสอบคำเชิญ...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void params.then(({ token: value }) => setToken(value));
  }, [params]);

  const accept = async () => {
    if (!token) return;
    setMessage("กำลังเข้าร่วม Organization...");
    setError(null);
    const response = await fetch(`${apiOrigin}/api/v1/organizations/invitations/${encodeURIComponent(token)}/accept`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      setError("ไม่สามารถใช้คำเชิญนี้ได้ อาจหมดอายุหรือถูกใช้ไปแล้ว");
      return;
    }
    const result = (await response.json()) as {
      organization: { slug: string };
    };
    setMessage("เข้าร่วม Organization สำเร็จ");
    router.push(`/${encodeURIComponent(result.organization.slug)}`);
    router.refresh();
  };

  return (
    <Card maw={520} mx="auto" mt="xl" withBorder>
      <Stack>
        <Title order={3}>คำเชิญเข้า Organization</Title>
        <Text>{message}</Text>
        {error ? <Alert color="red">{error}</Alert> : null}
        <Button onClick={() => void accept()} disabled={!token || Boolean(error)}>เข้าร่วม</Button>
      </Stack>
    </Card>
  );
}
