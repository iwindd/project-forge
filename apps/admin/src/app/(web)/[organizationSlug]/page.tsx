import { getPath } from '@/routes';
import { getOrganizations } from '@/servers/organization/queries/get-organizations';
import { Card, Container, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Organization | Project Forge',
  description: 'ภาพรวม Organization',
};

type OrganizationOverviewPageProps = Readonly<{
  params: Promise<{ organizationSlug: string }>;
}>;

export default async function OrganizationOverviewPage({ params }: OrganizationOverviewPageProps) {
  const { organizationSlug } = await params;
  const [organizations, t] = await Promise.all([getOrganizations(), getTranslations('OrganizationOverview')]);
  const organization = organizations.find((candidate) => candidate.slug === organizationSlug);

  if (!organization) {
    notFound();
  }

  const canManageOrganization =
    organization.role.isOwner || organization.role.permissions.includes('organization.manage');
  const organizationType = organization.type === 'PERSONAL' ? t('personal') : t('shared');
  const summary = organization.type === 'PERSONAL' ? t('personalSummary') : t('sharedSummary');

  const links = [
    {
      href: getPath('projects', { organizationSlug: organization.slug }),
      title: t('projects'),
      description: t('projectsDescription'),
    },
    ...(canManageOrganization
      ? [
          {
            href: getPath('settings.members', { organizationSlug: organization.slug }),
            title: t('members'),
            description: t('membersDescription'),
          },
          {
            href: getPath('settings.roles', { organizationSlug: organization.slug }),
            title: t('roles'),
            description: t('rolesDescription'),
          },
        ]
      : []),
  ];

  return (
    <Container w='100%' size='xl'>
      <Stack gap='xl'>
        <Stack gap='xs'>
          <Text c='dimmed' size='sm'>
            {organizationType}
          </Text>
          <Title order={1}>{organization.name}</Title>
          <Text c='dimmed' maw={680}>
            {summary}
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing='md'>
          {links.map((link) => (
            <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
              <Card withBorder padding='lg' radius='md' shadow='sm'>
                <Stack gap='xs'>
                  <Text c='inherit' fw={700} size='lg'>
                    {link.title}
                  </Text>
                  <Text c='dimmed' size='sm'>
                    {link.description}
                  </Text>
                </Stack>
              </Card>
            </Link>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
