'use client';

import type { PreloadedState } from '@/lib/store';
import { shadcnTheme } from '@/themes/shadcn';
import { shadcnCssVariableResolver } from '@/themes/shadcn/cssVariableResolver';
import '@/themes/shadcn/shadcn.style.css';
import { localStorageColorSchemeManager, MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import type { ReactNode } from 'react';
// Keep sidebar navigation CSS in the shared admin CSS entry for production.
import '../navigation/sidebar-nav-content.module.css';
import { APP_COLOR_SCHEME_KEY } from '../../lib/constants';
import { StoreProvider } from './store-provider';

const colorSchemeManager = localStorageColorSchemeManager({
  key: APP_COLOR_SCHEME_KEY,
});

dayjs.extend(buddhistEra);

export function AppProvider({
  children,
  preloadedState,
}: Readonly<{ children: ReactNode; preloadedState: PreloadedState }>) {
  return (
    <MantineProvider
      theme={shadcnTheme}
      cssVariablesResolver={shadcnCssVariableResolver}
      colorSchemeManager={colorSchemeManager}
      defaultColorScheme='auto'
      deduplicateInlineStyles
    >
      <DatesProvider settings={{ locale: 'th', firstDayOfWeek: 0 }}>
        <Notifications position='bottom-right' />
        <ModalsProvider>
          <StoreProvider preloadedState={preloadedState}>{children}</StoreProvider>
        </ModalsProvider>
      </DatesProvider>
    </MantineProvider>
  );
}
