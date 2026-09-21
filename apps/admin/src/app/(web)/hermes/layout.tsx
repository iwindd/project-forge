import { auth } from '@/auth';
import { AdminShell } from '@/components/admin-shell';
import { HermesChatTitleProvider } from '@/components/hermes-chat-title-context';
import { AppProvider } from '@/components/providers/app-provider';
import { createPreloadedState } from '@/lib/store';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type HermesLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function HermesLayout({ children }: HermesLayoutProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const preloadedState = await createPreloadedState({ user: session.user }, []);

  return (
    <AppProvider preloadedState={preloadedState}>
      <HermesChatTitleProvider>
        <AdminShell user={session.user} navigationMode='hermes'>
          {children}
        </AdminShell>
      </HermesChatTitleProvider>
    </AppProvider>
  );
}
