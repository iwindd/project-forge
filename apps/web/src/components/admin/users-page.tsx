'use client';

import { Alert, Avatar, Badge, Button, Card, Group, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { IconInfoCircle, IconRefresh } from '@tabler/icons-react';
import { useState } from 'react';
import type { User } from '@/lib/api';
import {
  useGetUsersQuery,
  useRevokeUserSessionsMutation,
  useUpdateUserRoleMutation,
  useUpdateUserStatusMutation,
} from '@/store/api';

const statuses: User['accessStatus'][] = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

function errorMessage(error: unknown) {
  const message = (error as { data?: { message?: string | string[] } } | undefined)?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message || 'จัดการ users ไม่สำเร็จ';
}

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const query = useGetUsersQuery({ search: appliedSearch, status: status || '' });
  const [updateStatus, statusState] = useUpdateUserStatusMutation();
  const [updateRole, roleState] = useUpdateUserRoleMutation();
  const [revoke, revokeState] = useRevokeUserSessionsMutation();
  const busy = statusState.isLoading || roleState.isLoading || revokeState.isLoading;
  const error = query.error || statusState.error || roleState.error || revokeState.error;

  async function changeStatus(user: User, next: string | null) {
    if (!next || next === user.accessStatus || !window.confirm(`เปลี่ยนสถานะ ${user.githubLogin} เป็น ${next} หรือไม่?`))
      return;
    await updateStatus({ id: user.id, status: next as User['accessStatus'] });
  }

  async function changeRole(user: User, next: string | null) {
    if (!next || next === user.role || !window.confirm(`เปลี่ยน role ของ ${user.githubLogin} เป็น ${next} หรือไม่?`)) return;
    await updateRole({ id: user.id, role: next as User['role'] });
  }

  async function revokeSessions(user: User) {
    if (!window.confirm(`Revoke ทุก session ของ ${user.githubLogin} หรือไม่?`)) return;
    await revoke(user.id);
  }

  return (
    <Stack gap='xl'>
      <Stack className='forge-page-header' gap={4}>
        <Text size='sm' c='brandBlue' fw={700} tt='uppercase' lts={1.5}>
          Access control
        </Text>
        <Title order={1}>Users</Title>
        <Text c='dimmed'>ค้นหาและจัดการ access status กับ role ของผู้ใช้</Text>
      </Stack>
      <Card padding='md' radius='lg'>
        <Group align='flex-end' wrap='wrap'>
          <TextInput
            label='GitHub login'
            placeholder='Search users'
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setAppliedSearch(search);
            }}
          />
          <Select
            label='Status'
            placeholder='All statuses'
            clearable
            value={status}
            onChange={setStatus}
            data={statuses}
          />
          <Button leftSection={<IconRefresh size={17} />} onClick={() => setAppliedSearch(search)}>
            Search
          </Button>
          <Text size='sm' c='dimmed' ml='auto'>
            {query.data?.data.length ?? 0} users shown
          </Text>
        </Group>
      </Card>
      {error ? (
        <Alert color='red' icon={<IconInfoCircle size={18} />}>
          {errorMessage(error)}
        </Alert>
      ) : null}
      <Card padding={0} radius='lg' className='forge-table-wrap'>
        <Table.ScrollContainer minWidth={760}>
          <Table verticalSpacing='md' highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User</Table.Th>
                <Table.Th>Access</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Joined</Table.Th>
                <Table.Th>Security</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {query.isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c='dimmed' ta='center' py='xl'>
                      กำลังโหลด users…
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
              {query.data?.data.map((user) => (
                <Table.Tr key={user.id}>
                  <Table.Td>
                    <Group gap='sm' wrap='nowrap'>
                      <Avatar src={user.avatarUrl} color='brandBlue' radius='xl'>
                        {(user.name || user.githubLogin).slice(0, 1).toUpperCase()}
                      </Avatar>
                      <Stack gap={0}>
                        <Text fw={600}>{user.name || user.githubLogin}</Text>
                        <Text size='xs' c='dimmed'>
                          @{user.githubLogin}
                        </Text>
                      </Stack>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Select
                      disabled={busy}
                      value={user.accessStatus}
                      onChange={(next) => void changeStatus(user, next)}
                      data={statuses}
                      allowDeselect={false}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Select
                      disabled={busy}
                      value={user.role}
                      onChange={(next) => void changeRole(user, next)}
                      data={['USER', 'ADMIN']}
                      allowDeselect={false}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Badge variant='light' color={user.isActive ? 'teal' : 'gray'}>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH') : '—'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Button variant='default' size='xs' disabled={busy} onClick={() => void revokeSessions(user)}>
                      Revoke sessions
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
              {!query.isLoading && !query.data?.data.length ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c='dimmed' ta='center' py='xl'>
                      ไม่พบ users
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}
