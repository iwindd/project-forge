'use client'

import { ColorSchemeScript } from '@mantine/core'
import { useServerInsertedHTML } from 'next/navigation'

import { APP_COLOR_SCHEME_KEY } from '@/lib/constants'

export function AppColorSchemaScript() {
  useServerInsertedHTML(() => (
    <ColorSchemeScript
      defaultColorScheme='auto'
      localStorageKey={APP_COLOR_SCHEME_KEY}
    />
  ))

  return null
}
