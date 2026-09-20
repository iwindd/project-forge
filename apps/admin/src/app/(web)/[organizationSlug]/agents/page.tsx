import { SharedAgentsRoster } from '@/components/shared-agents-roster';
import { PageHeader } from '@/components/page-header';
import { Container, Stack } from '@mantine/core';
import { getTranslations } from 'next-intl/server';

export default async function SharedAgentsPage() {
  const t = await getTranslations('SharedAgents');

  return (
    <Container w='100%' size='xl'>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <Stack gap='lg'>
        <SharedAgentsRoster />
      </Stack>
    </Container>
  );
}
