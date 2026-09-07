'use client';

import { Alert, Anchor, Card, Group, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconInfoCircle, IconUserCheck, IconUsers } from '@tabler/icons-react';
import Link from 'next/link';
import { useGetAccessRequestsQuery, useGetUsersQuery } from '@/store/api';

export function AdminOverview() {
  const users = useGetUsersQuery({});
  const access = useGetAccessRequestsQuery();
  const error = users.error || access.error;

  return (
    <Stack gap='xl'>
      <Stack className='forge-page-header' gap={4}>
        <Text size='sm' c='brandBlue' fw={700} tt='uppercase' lts={1.5}>
          Administration
        </Text>
        <Title order={1}>Overview</Title>
        <Text c='dimmed'>จัดการผู้ใช้และคำขอเข้าใช้งานของระบบภายใน</Text>
      </Stack>
      {error ? (
        <Alert color='red' icon={<IconInfoCircle size={18} />}>
          โหลดข้อมูล admin ไม่สำเร็จ
        </Alert>
      ) : null}
      {users.isLoading || access.isLoading ? (
        <Card className='forge-empty'>
          <Loader size='sm' color='brandBlue' />
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing='lg'>
          <Card padding='xl' radius='lg'>
            <Group justify='space-between' align='flex-start'>
              <Stack gap={4}>
                <Text c='dimmed'>Users</Text>
                <Title order={2}>{users.data?.total ?? 0}</Title>
                <Anchor component={Link} href='/admin/users' size='sm'>
                  View users
                </Anchor>
              </Stack>
              <IconUsers size={32} color='var(--mantine-primary-color-filled)' stroke={1.5} />
            </Group>
          </Card>
          <Card padding='xl' radius='lg'>
            <Group justify='space-between' align='flex-start'>
              <Stack gap={4}>
                <Text c='dimmed'>Pending access requests</Text>
                <Title order={2}>{access.data?.requests.filter((item) => item.status === 'PENDING').length ?? 0}</Title>
                <Anchor component={Link} href='/admin/access-requests' size='sm'>
                  Review requests
                </Anchor>
              </Stack>
              <IconUserCheck size={32} color='var(--mantine-primary-color-filled)' stroke={1.5} />
            </Group>
          </Card>
        </SimpleGrid>
      )}
      <Alert color='blue' variant='light' icon={<IconInfoCircle size={18} />} title='Phase 1 policy'>
        Admin actions ถูกตรวจซ้ำที่ NestJS API และบันทึก audit ทุก mutation ระบบยังไม่มี Hermes, Chat, Sandbox, Issues หรือ Pull
        Requests ใน phase นี้
      </Alert>
    </Stack>
  );
}
