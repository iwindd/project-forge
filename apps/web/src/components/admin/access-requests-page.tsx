'use client';

import { Alert, Badge, Button, Card, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useDecideAccessMutation, useGetAccessRequestsQuery } from '@/store/api';

function errorMessage(error: unknown) {
  const message = (error as { data?: { message?: string | string[] } } | undefined)?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message || 'บันทึกผลไม่สำเร็จ';
}

export function AccessRequestsPage() {
  const { data, isLoading, error } = useGetAccessRequestsQuery();
  const [decideAccess, mutation] = useDecideAccessMutation();
  const requests = data?.requests ?? [];

  async function decide(id: string, decision: 'approve' | 'reject', login: string) {
    if (!window.confirm(`${decision === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'} access ของ ${login} หรือไม่?`)) return;
    await decideAccess({ id, decision });
  }

  return (
    <Stack gap='xl'>
      <Stack className='forge-page-header' gap={4}>
        <Text size='sm' c='brandBlue' fw={700} tt='uppercase' lts={1.5}>
          Admission queue
        </Text>
        <Title order={1}>Access requests</Title>
        <Text c='dimmed'>ตรวจคำขอเข้าใช้งานก่อนให้ผู้ใช้เข้าระบบ</Text>
      </Stack>
      {error || mutation.error ? (
        <Alert color='red' icon={<IconInfoCircle size={18} />}>
          {errorMessage(error || mutation.error)}
        </Alert>
      ) : null}
      {isLoading ? (
        <Card className='forge-empty'>
          <Loader size='sm' color='brandBlue' />
        </Card>
      ) : requests.length === 0 ? (
        <Card className='forge-empty'>
          <Text c='dimmed'>ไม่มี access request</Text>
        </Card>
      ) : (
        <Stack gap='md'>
          {requests.map((request) => {
            const login = request.user?.githubLogin || request.userId;
            return (
              <Card key={request.id} padding='lg' radius='lg'>
                <Group justify='space-between' align='flex-start' wrap='wrap'>
                  <Stack gap={5}>
                    <Group gap='sm'>
                      <Badge
                        color={request.status === 'PENDING' ? 'yellow' : request.status === 'APPROVED' ? 'teal' : 'red'}
                        variant='light'
                      >
                        {request.status}
                      </Badge>
                      <Text fw={700}>{request.user?.name || login}</Text>
                    </Group>
                    <Text size='sm' c='dimmed'>
                      @{login} · {new Date(request.createdAt).toLocaleString('th-TH')}
                    </Text>
                    <Text>{request.reason || 'ไม่ได้ระบุเหตุผล'}</Text>
                  </Stack>
                  {request.status === 'PENDING' ? (
                    <Group>
                      <Button loading={mutation.isLoading} onClick={() => void decide(request.id, 'approve', login)}>
                        Approve
                      </Button>
                      <Button
                        color='red'
                        variant='light'
                        loading={mutation.isLoading}
                        onClick={() => void decide(request.id, 'reject', login)}
                      >
                        Reject
                      </Button>
                    </Group>
                  ) : (
                    <Text size='sm' c='dimmed'>
                      Reviewed {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString('th-TH') : ''}
                    </Text>
                  )}
                </Group>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
