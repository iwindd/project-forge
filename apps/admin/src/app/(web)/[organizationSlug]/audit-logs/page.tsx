import { PageHeader } from '@/components/page-header';
import { AuditLogsTable } from '@/lib/features/audit-log/audit-logs-table';
import { Container, Stack } from '@mantine/core';
import { getTranslations } from 'next-intl/server';

export default async function AuditLogsPage() {
  const t = await getTranslations('AuditLogs');

  return (
    <Container w='100%' size='xl'>
      <PageHeader title={t('title')} />
      <Stack gap='lg'>
        <AuditLogsTable scope='all' />
      </Stack>
    </Container>
  );
}
