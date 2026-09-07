'use client';

import { Alert, Badge, Button, Card, Group, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconArchive, IconFolderPlus, IconGitBranch, IconInfoCircle } from '@tabler/icons-react';
import Link from 'next/link';
import { useArchiveProjectMutation, useGetProjectsQuery } from '@/store/api';

function errorMessage(error: unknown, fallback: string) {
  const message = (error as { data?: { message?: string | string[] } } | undefined)?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message || fallback;
}

export function ProjectsPage() {
  const { data, isLoading, isFetching, error } = useGetProjectsQuery();
  const [archiveProject, archiveState] = useArchiveProjectMutation();
  const projects = data?.projects ?? [];

  async function archive(id: string) {
    if (!window.confirm('Archive project นี้หรือไม่?')) return;
    await archiveProject(id)
      .unwrap()
      .catch(() => undefined);
  }

  return (
    <Stack gap='xl'>
      <Group className='forge-page-header' justify='space-between' align='flex-end' wrap='wrap'>
        <Stack gap={4}>
          <Text size='sm' c='brandBlue' fw={700} tt='uppercase' lts={1.5}>
            Project registry
          </Text>
          <Title order={1}>Projects</Title>
          <Text c='dimmed'>จัดการ repository ที่จะเชื่อมต่อกับ workspace ใน phase ถัดไป</Text>
        </Stack>
        <Button component={Link} href='/projects/new' leftSection={<IconFolderPlus size={18} />}>
          Add project
        </Button>
      </Group>

      <Alert color='blue' variant='light' icon={<IconInfoCircle size={19} />}>
        Phase 1 เป็น metadata-only: การเพิ่ม project ยังไม่ clone, ไม่สร้าง sandbox, ไม่ install, ไม่ build และไม่เรียก Hermes
      </Alert>

      {error ? <Alert color='red'>{errorMessage(error, 'โหลด projects ไม่สำเร็จ')}</Alert> : null}
      {isLoading || isFetching ? (
        <Card className='forge-empty'>
          <Stack align='center' gap='sm'>
            <Loader size='sm' color='brandBlue' />
            <Text c='dimmed'>กำลังโหลด projects…</Text>
          </Stack>
        </Card>
      ) : projects.length === 0 ? (
        <Card className='forge-empty' padding='xl'>
          <Stack align='center' gap='sm'>
            <IconGitBranch size={42} color='var(--mantine-primary-color-filled)' stroke={1.4} />
            <Title order={3}>ยังไม่มี project</Title>
            <Text c='dimmed' ta='center'>
              เพิ่ม GitHub repository แรกเพื่อเตรียมระบบสำหรับ Phase 2
            </Text>
            <Button component={Link} href='/projects/new' variant='light'>
              Add your first project
            </Button>
          </Stack>
        </Card>
      ) : (
        <SimpleGrid className='forge-card-grid' cols={{ base: 1, sm: 2, lg: 3 }} spacing='lg'>
          {projects.map((project) => (
            <Card key={project.id} padding='lg' radius='lg' h='100%'>
              <Stack justify='space-between' h='100%' gap='lg'>
                <Stack gap='sm'>
                  <Group justify='space-between' align='flex-start' wrap='nowrap'>
                    <Badge color={project.status === 'ACTIVE' ? 'teal' : 'gray'} variant='light'>
                      {project.status}
                    </Badge>
                    <Text size='xs' c='dimmed' ta='right' lineClamp={1}>
                      {project.githubOwner}/{project.githubRepo}
                    </Text>
                  </Group>
                  <Title order={3}>{project.name}</Title>
                  <Text size='sm' c='dimmed' lineClamp={2}>
                    {project.githubUrl}
                  </Text>
                  <Stack gap={5} mt='xs'>
                    <Group justify='space-between'>
                      <Text size='sm' c='dimmed'>
                        Branches
                      </Text>
                      <Text size='sm'>
                        {project.sourceBranch} → {project.targetBranch}
                      </Text>
                    </Group>
                    <Group justify='space-between'>
                      <Text size='sm' c='dimmed'>
                        Node
                      </Text>
                      <Text size='sm'>{project.nodeVersion || 'Not set'}</Text>
                    </Group>
                    <Group justify='space-between'>
                      <Text size='sm' c='dimmed'>
                        Created
                      </Text>
                      <Text size='sm'>{new Date(project.createdAt).toLocaleDateString('th-TH')}</Text>
                    </Group>
                  </Stack>
                </Stack>
                <Group gap='sm'>
                  <Button component={Link} href={`/projects/${project.id}`} variant='light' flex={1}>
                    Open
                  </Button>
                  <Button
                    color='red'
                    variant='subtle'
                    leftSection={<IconArchive size={17} />}
                    loading={archiveState.isLoading}
                    onClick={() => void archive(project.id)}
                  >
                    Archive
                  </Button>
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
