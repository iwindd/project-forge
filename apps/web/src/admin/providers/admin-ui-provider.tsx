'use client';

import { localStorageColorSchemeManager, MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { ADMIN_COLOR_SCHEME_KEY } from '../constants';
import { adminTheme } from '../theme';
import { StoreProvider } from './store-provider';

const colorSchemeManager = localStorageColorSchemeManager({ key: ADMIN_COLOR_SCHEME_KEY });

export function AdminUIProvider({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <MantineProvider
      theme={adminTheme}
      colorSchemeManager={colorSchemeManager}
      defaultColorScheme='auto'
      deduplicateInlineStyles
    >
      <StoreProvider>{children}</StoreProvider>
    </MantineProvider>
  );
}
