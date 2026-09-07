'use client';

import { Anchor, Card, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useGetMeQuery } from '@/store/api';

export function AccessBlockedCard() {
  const { data } = useGetMeQuery();

  return (
    <main className='forge-auth-page'>
      <Card className='forge-auth-card' padding='xl' radius='lg'>
        <Stack align='center' gap='lg'>
          <ThemeIcon size={56} radius='xl' color='red' variant='light'>
            <IconLock size={28} />
          </ThemeIcon>
          <Stack align='center' gap='xs'>
            <Text size='sm' c='red' fw={700} tt='uppercase' lts={1.5}>
              Access blocked
            </Text>
            <Title order={1} ta='center'>
              ยังเข้าใช้งานไม่ได้
            </Title>
            <Text c='dimmed' ta='center'>
              บัญชี @{data?.user.githubLogin || 'นี้'} มีสถานะ {data?.user.accessStatus || 'REJECTED'} กรุณาติดต่อ admin
              หากคิดว่าเป็นความผิดพลาด
            </Text>
          </Stack>
          <Anchor href='/login'>กลับหน้า login</Anchor>
        </Stack>
      </Card>
    </main>
  );
}
