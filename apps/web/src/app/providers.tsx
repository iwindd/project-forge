'use client';

import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { StoreProvider } from '@/store/provider';
import { projectForgeTheme } from '@/theme';

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <MantineProvider theme={projectForgeTheme} defaultColorScheme='auto' deduplicateInlineStyles>
      <StoreProvider>{children}</StoreProvider>
    </MantineProvider>
  );
}
