import { AppProvider } from '@/components/providers/app-provider';
import { createPreloadedState } from '@/lib/store';
import type { ReactNode } from 'react';

export default async function AuthenticationLayout({ children }: Readonly<{ children: ReactNode }>) {
  const preloadedState = await createPreloadedState({ user: null }, []);

  return <AppProvider preloadedState={preloadedState}>{children}</AppProvider>;
}
