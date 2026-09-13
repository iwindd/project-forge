'use client';

import { Alert, Button, Card, Stack, Text, Title } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getBrowserApiErrorMessage } from '@/lib/api/api';
import { useAcceptInvitationMutation } from '@/lib/features/organization/organization-members-api';

export default function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState('กำลังตรวจสอบคำเชิญ...');
  const [error, setError] = useState<string | null>(null);
  const [acceptInvitation, { isLoading }] = useAcceptInvitationMutation();

  useEffect(() => {
    void params.then(({ token: value }) => setToken(value));
  }, [params]);

  const accept = async () => {
    const invitationToken = token ?? window.location.pathname.split('/').pop();
    if (!invitationToken) return;
    setMessage('กำลังเข้าร่วม Organization...');
    setError(null);
    try {
      const result = await acceptInvitation({ token: invitationToken }).unwrap();
      setMessage('เข้าร่วม Organization สำเร็จ');
      router.push(`/${encodeURIComponent(result.organization.slug)}`);
      router.refresh();
    } catch (acceptError) {
      setMessage('ไม่สามารถเข้าร่วม Organization ได้');
      setError(getBrowserApiErrorMessage(acceptError, 'ไม่สามารถใช้คำเชิญนี้ได้ อาจหมดอายุหรือถูกใช้ไปแล้ว'));
    }
  };

  return (
    <Card maw={520} mx='auto' mt='xl' withBorder>
      <Stack>
        <Title order={3}>คำเชิญเข้า Organization</Title>
        <Text>{message}</Text>
        {error ? <Alert color='red'>{error}</Alert> : null}
        <Button onClick={() => void accept()} loading={isLoading} disabled={isLoading}>
          เข้าร่วม
        </Button>
      </Stack>
    </Card>
  );
}
