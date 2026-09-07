'use client';

import { Alert, Button, Card, Group, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Project } from '@/lib/api';
import { type ProjectInput, useCreateProjectMutation, useUpdateProjectMutation } from '@/store/api';

type Props = { project?: Project };

function mutationError(error: unknown) {
  const message = (error as { data?: { message?: string | string[] } } | undefined)?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message || 'บันทึก project ไม่สำเร็จ';
}

export function ProjectForm({ project }: Props) {
  const router = useRouter();
  const [name, setName] = useState(project?.name || '');
  const [githubUrl, setGithubUrl] = useState(project?.githubUrl || '');
  const [sourceBranch, setSourceBranch] = useState(project?.sourceBranch || 'main');
  const [targetBranch, setTargetBranch] = useState(project?.targetBranch || 'main');
  const [nodeVersion, setNodeVersion] = useState(project?.nodeVersion || '');
  const [environmentKeys, setEnvironmentKeys] = useState(Object.keys(project?.environmentMetadata || {}).join(', '));
  const [createProject, createState] = useCreateProjectMutation();
  const [updateProject, updateState] = useUpdateProjectMutation();
  const mutation = project ? updateState : createState;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const environmentMetadata = Object.fromEntries(
      environmentKeys
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean)
        .map((key) => [key, 'configured']),
    );
    const body: ProjectInput = { name, githubUrl, sourceBranch, targetBranch, nodeVersion, environmentMetadata };
    try {
      if (project) await updateProject({ id: project.id, body }).unwrap();
      else await createProject(body).unwrap();
      router.push(project ? `/projects/${project.id}` : '/projects');
    } catch {
      // The mutation error is rendered below from RTK Query state.
    }
  }

  return (
    <Card component='form' onSubmit={(event) => void submit(event)} padding='xl' radius='lg'>
      <Stack gap='xl'>
        <Stack gap={4}>
          <Text size='sm' c='brandBlue' fw={700} tt='uppercase' lts={1.5}>
            Metadata only
          </Text>
          <Title order={2}>{project ? 'Edit project' : 'Add project'}</Title>
          <Text c='dimmed'>Phase 1 เก็บข้อมูล repository เท่านั้น ยังไม่ clone, ไม่สร้าง sandbox และไม่เรียก Hermes</Text>
        </Stack>
        {mutation.error ? <Alert color='red'>{mutationError(mutation.error)}</Alert> : null}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing='lg'>
          <TextInput
            label='Name (optional)'
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder='ใช้ชื่อ repository หากเว้นว่าง'
            maxLength={120}
          />
          <TextInput
            label='GitHub repository URL'
            required
            value={githubUrl}
            onChange={(event) => setGithubUrl(event.currentTarget.value)}
            placeholder='https://github.com/owner/repository'
          />
          <TextInput
            label='Source branch'
            required
            value={sourceBranch}
            onChange={(event) => setSourceBranch(event.currentTarget.value)}
          />
          <TextInput
            label='Target branch'
            required
            value={targetBranch}
            onChange={(event) => setTargetBranch(event.currentTarget.value)}
          />
          <TextInput
            label='Node.js version'
            value={nodeVersion}
            onChange={(event) => setNodeVersion(event.currentTarget.value)}
            placeholder='เช่น 22'
          />
          <TextInput
            label='Environment key names (optional)'
            value={environmentKeys}
            onChange={(event) => setEnvironmentKeys(event.currentTarget.value)}
            placeholder='DATABASE_URL, API_URL'
            description='เก็บเฉพาะชื่อ key เป็น configured ไม่เก็บค่า secret'
          />
        </SimpleGrid>
        <Group>
          <Button type='submit' loading={mutation.isLoading}>
            {project ? 'Save changes' : 'Create project'}
          </Button>
          <Button type='button' variant='default' onClick={() => router.back()}>
            Cancel
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
