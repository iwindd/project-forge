'use client';

import { Alert, Anchor, Button, Card, Stack, Text, Textarea, Title } from '@mantine/core';
import { IconClock, IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { useGetMeQuery, useRequestAccessMutation } from '@/store/api';

export function AccessPendingCard() {
  const { data } = useGetMeQuery();
  const [requestAccess, { isLoading, isSuccess, error }] = useRequestAccessMutation();
  const [reason, setReason] = useState('');
  const message = (error as { data?: { message?: string } } | undefined)?.data?.message;

  return (
    <main className='forge-auth-page'>
      <Card className='forge-auth-card' padding='xl' radius='lg'>
        <Stack gap='lg'>
          <IconClock size={38} color='var(--mantine-primary-color-filled)' />
          <Stack gap='xs'>
            <Text size='sm' c='brandBlue' fw={700} tt='uppercase' lts={1.5}>
              Access review
            </Text>
            <Title order={1}>รอการอนุมัติ</Title>
            <Text c='dimmed'>บัญชี @{data?.user.githubLogin || '…'} ถูกสร้างแล้ว แต่ยังไม่มีสิทธิ์เข้าใช้งาน Project Forge</Text>
          </Stack>
          {isSuccess ? <Alert color='teal'>ส่งคำขอให้ admin แล้ว</Alert> : null}
          {message ? (
            <Alert color='red' icon={<IconInfoCircle size={18} />}>
              {message}
            </Alert>
          ) : null}
          <Textarea
            label='เหตุผลเพิ่มเติม (optional)'
            placeholder='บอก admin สั้น ๆ ว่าต้องการใช้งานเพื่ออะไร'
            minRows={4}
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
          />
          <Button loading={isLoading} onClick={() => void requestAccess(reason).unwrap()}>
            Request access
          </Button>
          <Anchor href='/login' size='sm'>
            กลับหน้า login
          </Anchor>
        </Stack>
      </Card>
    </main>
  );
}
