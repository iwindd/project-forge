'use client'

import { localStorageColorSchemeManager, MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import type { ReactNode } from 'react'
import { ADMIN_COLOR_SCHEME_KEY } from '../constants'
import type { AuthState } from '@/lib/features/auth/auth-slice'
import { shadcnTheme } from '../theme'
import { shadcnCssVariableResolver } from '../theme/cssVariableResolver'
import '../theme/shadcn.style.css'
import { StoreProvider } from './store-provider'

const colorSchemeManager = localStorageColorSchemeManager({
  key: ADMIN_COLOR_SCHEME_KEY
})

dayjs.extend(buddhistEra)

export function AdminUIProvider({
  children,
  preloadedState
}: Readonly<{ children: ReactNode; preloadedState: { auth: AuthState } }>) {
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
          <StoreProvider preloadedState={preloadedState}>
            {children}
          </StoreProvider>
        </ModalsProvider>
      </DatesProvider>
    </MantineProvider>
  )
}
