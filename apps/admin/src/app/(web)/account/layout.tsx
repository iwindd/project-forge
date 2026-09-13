import { ProfileProvider } from '@/components/profile/profile-context';
import { auth } from '@/auth';
import { AdminShell } from '@/components/admin-shell';
import { ForbiddenState } from '@/components/forbidden-state';
import { PageHeader } from '@/components/page-header';
import { AppProvider } from '@/components/providers/app-provider';
import { createPreloadedState } from '@/lib/store';
import { isApiServerForbidden } from '@/lib/api-server';
import { getProfile } from '@/servers/profile/queries/get-profile';
import { Container } from '@mantine/core';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'บัญชีของฉัน | SimpleDashboard',
  description: 'จัดการบัญชีและประวัติการทำรายการของคุณ',
};

export default async function AccountLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  let profile = null;
  let forbidden = false;

  try {
    profile = await getProfile();
  } catch (error) {
    if (!isApiServerForbidden(error)) throw error;
    forbidden = true;
  }

  if (!profile && !forbidden) {
    notFound();
  }

  const preloadedState = await createPreloadedState({ user: session.user }, []);

  return (
    <AppProvider preloadedState={preloadedState}>
      {forbidden ? (
        <ForbiddenState />
      ) : (
        <AdminShell user={session.user} navigationMode='account'>
          {/* biome-ignore lint/style/noNonNullAssertion: notFound terminates when the profile is unavailable */}
          <ProfileProvider profile={profile!}>
            <Container w='100%' size='xl'>
              <PageHeader title='บัญชีของฉัน' />
              {children}
            </Container>
          </ProfileProvider>
        </AdminShell>
      )}
    </AppProvider>
  );
}
