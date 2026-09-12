import { AppColorSchemaScript } from '@/components/providers/app-color-schema-script'
import { fontClasses } from '@/themes/shadcn/font'
import { mantineHtmlProps } from '@mantine/core'
import '@mantine/tiptap/styles.css'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

export const metadata: Metadata = {
  title: 'SimpleDashboard Template',
  description: 'เทมเพลตแดชบอร์ด SimpleDashboard'
}

export default async function AppRootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
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
         * server, so without this blocking inline script every app page paints
         * light first and only turns dark after hydration. The key and default
         * must stay in sync with the colorSchemeManager in AppProvider.
         */}
        <AppColorSchemaScript />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
