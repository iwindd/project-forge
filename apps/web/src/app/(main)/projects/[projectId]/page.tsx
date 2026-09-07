'use client';

import { Alert, Anchor, Badge, Card, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconInfoCircle } from '@tabler/icons-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProjectForm } from '@/components/projects/project-form';
import { useGetProjectQuery } from '@/store/api';

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const { data, isLoading, error } = useGetProjectQuery(params.projectId);

  if (isLoading) {
    return (
      <Card className='forge-empty'>
        <Loader size='sm' color='brandBlue' />
      </Card>
    );
  }

  if (error || !data?.project) {
    const message = (error as { data?: { message?: string } } | undefined)?.data?.message || 'โหลด project ไม่สำเร็จ';
    return (
      <Alert color='red' icon={<IconInfoCircle size={18} />}>
        {message}
      </Alert>
    );
  }

  const project = data.project;
  return (
    <Stack gap='xl'>
      <Stack gap='sm'>
        <Anchor component={Link} href='/projects' size='sm' underline='never'>
          <Group gap={5}>
            <IconArrowLeft size={16} /> Projects
          </Group>
        </Anchor>
        <Group justify='space-between' align='flex-end' wrap='wrap'>
          <Stack gap={4}>
            <Text size='sm' c='brandBlue' fw={700} tt='uppercase' lts={1.5}>
              Project details
            </Text>
            <Title order={1}>{project.name}</Title>
            <Text c='dimmed'>{project.githubUrl}</Text>
          </Stack>
          <Badge color={project.status === 'ACTIVE' ? 'teal' : 'gray'} variant='light' size='lg'>
            {project.status}
          </Badge>
        </Group>
      </Stack>
      <ProjectForm project={project} />
    </Stack>
  );
}
