'use client';

import { Anchor, Group, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';
import { ProjectForm } from '@/components/projects/project-form';

export default function NewProjectPage() {
  return (
    <Stack gap='xl'>
      <Stack gap='sm'>
        <Anchor component={Link} href='/projects' size='sm' underline='never'>
          <Group gap={5}>
            <IconArrowLeft size={16} /> Projects
          </Group>
        </Anchor>
        <Text size='sm' c='brandBlue' fw={700} tt='uppercase' lts={1.5}>
          Project registry
        </Text>
        <Title order={1}>Add project</Title>
      </Stack>
      <ProjectForm />
    </Stack>
  );
}
