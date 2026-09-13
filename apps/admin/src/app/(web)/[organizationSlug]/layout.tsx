import { auth } from '@/auth';
import { AdminShell } from '@/components/admin-shell';
import { AppProvider } from '@/components/providers/app-provider';
import { createPreloadedState } from '@/lib/store';
import { scopeUserToOrganization } from '@/session';
import { getOrganizations } from '@/servers/organization/queries/get-organizations';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SimpleDashboard Template',
  description: 'เทมเพลตแดชบอร์ด SimpleDashboard',
};

type OrganizationLayoutProps = Readonly<{
  children: ReactNode;
  params: Promise<{ organizationSlug: string }>;
}>;

export default async function OrganizationLayout({ children, params }: OrganizationLayoutProps) {
  const { organizationSlug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const organizations = await getOrganizations();

  const organization = organizations.find((candidate) => candidate.slug === organizationSlug);

  if (!organization) {
    notFound();
  }

  const user = scopeUserToOrganization(session.user, organization);
  const preloadedState = await createPreloadedState({ user }, organizations);

  return (
    <AppProvider preloadedState={preloadedState}>
      <AdminShell user={user} organizationSlug={organization.slug} organizationId={organization.id}>
        {children}
      </AdminShell>
    </AppProvider>
  );
}
