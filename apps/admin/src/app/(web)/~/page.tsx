import { auth } from '@/auth';
import { AppProvider } from '@/components/providers/app-provider';
import { createPreloadedState } from '@/lib/store';
import { getPath } from '@/routes';
import { getOrganizations } from '@/servers/organization/queries/get-organizations';
import { Avatar, Badge, Card, Container, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'เลือก Organization | Project Forge',
  description: 'เลือก Organization ที่ต้องการใช้งาน',
};

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'O';
}

export default async function OrganizationPickerPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const [organizations, t] = await Promise.all([getOrganizations(), getTranslations('OrganizationPicker')]);
  const activeOrganizations = organizations.filter((organization) => !organization.status || organization.status === 'ACTIVE');
  const preloadedState = await createPreloadedState({ user: session.user }, organizations);

  return (
    <AppProvider preloadedState={preloadedState}>
      <main>
        <Container size='md' px={{ base: 'md', sm: 'xl' }} py={{ base: 'xl', sm: 64 }}>
          <Stack gap='xl'>
            <Stack gap='xs'>
              <Title order={1}>{t('title')}</Title>
              <Text c='dimmed'>{t('description')}</Text>
            </Stack>

            {activeOrganizations.length > 0 ? (
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing='md'>
                {activeOrganizations.map((organization) => (
                  <Link
                    key={organization.id}
                    href={getPath('overview', { organizationSlug: organization.slug })}
                    style={{ textDecoration: 'none' }}
                  >
                    <Card withBorder padding='lg' radius='md' shadow='sm'>
                      <Stack gap='md'>
                        <Avatar color='blue' radius='xl' size={44}>
                          {getInitial(organization.name)}
                        </Avatar>
                        <Stack gap={4}>
                          <Text c='inherit' fw={700} size='lg'>
                            {organization.name}
                          </Text>
                          <Text c='dimmed' size='sm'>
                            {organization.slug}
                          </Text>
                        </Stack>
                        <Badge variant='light' w='fit-content'>
                          {organization.type === 'PERSONAL' ? t('personal') : t('shared')}
                        </Badge>
                      </Stack>
                    </Card>
                  </Link>
                ))}
              </SimpleGrid>
            ) : (
              <Card withBorder padding='xl' radius='md'>
                <Stack gap='xs'>
                  <Title order={3}>{t('emptyTitle')}</Title>
                  <Text c='dimmed'>{t('emptyDescription')}</Text>
                </Stack>
              </Card>
            )}
          </Stack>
        </Container>
      </main>
    </AppProvider>
  );
}
