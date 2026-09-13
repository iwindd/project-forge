import { PageHeader } from '@/components/page-header';
import { Container, Paper, Stack, Text } from '@mantine/core';
import { getTranslations } from 'next-intl/server';

export default async function OrganizationOverviewPage() {
  const navigation = await getTranslations('Navigation');
  const home = await getTranslations('Home');

  return (
    <Container w='100%' size='xl'>
      <PageHeader title={navigation('overview')} />
      <Paper withBorder radius='md' p='xl'>
        <Stack gap='xs'>
          <Text size='lg' fw={600}>
            {home('greeting')}
          </Text>
          <Text c='dimmed'>{home('welcome')}</Text>
        </Stack>
      </Paper>
    </Container>
  );
}
