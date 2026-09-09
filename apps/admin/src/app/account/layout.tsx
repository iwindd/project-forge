import { ProfileProvider } from '@/app/admin/(main)/profile/components/profile-context'
import { auth } from '@/auth'
import { AdminShell } from '@/components/admin-shell'
import { PageHeader } from '@/components/page-header'
import { AdminUIProvider } from '@/components/providers/mantine-provider'
import { ADMIN_COLOR_SCHEME_KEY } from '@/lib/constants'
import { getProfile } from '@/servers/profile/queries/get-profile'
import { fontClasses } from '@/themes/shadcn/font'
import { ColorSchemeScript, Container, mantineHtmlProps } from '@mantine/core'
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

  const organization =
    session.organizations.find(
      candidate => candidate.id === session.user.activeOrganizationId
    ) ?? session.organizations[0]

  if (!organization) {
    redirect('/admin/login?error=organization_unavailable')
  }

  const profile = await getProfile()

  if (!profile) {
    notFound()
  }

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
        <ColorSchemeScript
          defaultColorScheme='auto'
          localStorageKey={ADMIN_COLOR_SCHEME_KEY}
        />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AdminUIProvider
            preloadedState={{
              auth: { user: session.user }
            }}
          >
            <AdminShell
              user={session.user}
              organizationSlug={organization.slug}
              navigationMode='account'
            >
              <ProfileProvider profile={profile}>
                <Container w='100%' size='xl'>
                  <PageHeader title='บัญชีของฉัน' />
                  {children}
                </Container>
              </ProfileProvider>
            </AdminShell>
          </AdminUIProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
