import { ProfileProvider } from '@/app/admin/(main)/profile/components/profile-context'
import { auth } from '@/auth'
import { AdminShell } from '@/components/admin-shell'
import { AppColorSchemaScript } from '@/components/providers/app-color-schema-script'
import { PageHeader } from '@/components/page-header'
import { AppProvider } from '@/components/providers/app-provider'
import { createPreloadedState } from '@/lib/store'
import { getProfile } from '@/servers/profile/queries/get-profile'
import { fontClasses } from '@/themes/shadcn/font'
import { Container, mantineHtmlProps } from '@mantine/core'
import '@mantine/tiptap/styles.css'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'บัญชีของฉัน | SimpleDashboard',
  description: 'จัดการบัญชีและประวัติการทำรายการของคุณ'
}

export default async function AccountLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/admin/login')
  }

  const profile = await getProfile()

  if (!profile) {
    notFound()
  }

  const locale = await getLocale()
  const messages = await getMessages()
  const preloadedState = await createPreloadedState({ user: session.user }, [])

  return (
    <html
      lang={locale}
      {...mantineHtmlProps}
      suppressHydrationWarning
      className={fontClasses}
    >
      <head>
        <AppColorSchemaScript />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppProvider preloadedState={preloadedState}>
            <AdminShell
              user={session.user}
              navigationMode='account'
            >
              <ProfileProvider profile={profile}>
                <Container w='100%' size='xl'>
                  <PageHeader title='บัญชีของฉัน' />
                  {children}
                </Container>
              </ProfileProvider>
            </AdminShell>
          </AppProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
