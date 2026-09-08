'use client';

import type { ReactNode } from 'react';
import { AdminUIProvider } from '@/admin/providers/admin-ui-provider';

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  return <AdminUIProvider>{children}</AdminUIProvider>;
}
