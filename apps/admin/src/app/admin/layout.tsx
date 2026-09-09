import { auth } from '@/auth'
import { AdminUIProvider } from '@/components/providers/mantine-provider'
import { ADMIN_COLOR_SCHEME_KEY } from '@/lib/constants'
import { fontClasses } from '@/themes/shadcn/font'
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core'
import '@mantine/tiptap/styles.css'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

export const metadata: Metadata = {
  title: 'SimpleDashboard Template',
  description: 'เทมเพลตแดชบอร์ด SimpleDashboard'
}

export default async function AdminRootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth()
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      {...mantineHtmlProps}
      suppressHydrationWarning
      className={fontClasses}
    >
      <head>
        {/*
         * mantineHtmlProps hard-codes data-mantine-color-scheme="light" on the
         * server, so without this blocking inline script every admin page paints
         * light first and only turns dark after hydration. The key and default
         * must stay in sync with the colorSchemeManager in AdminUIProvider.
         */}
        <ColorSchemeScript
          defaultColorScheme='auto'
          localStorageKey={ADMIN_COLOR_SCHEME_KEY}
        />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AdminUIProvider
            preloadedState={{
              auth: { user: session?.user ?? null }
            }}
          >
            {children}
          </AdminUIProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
