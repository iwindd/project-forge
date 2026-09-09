import { auth } from '@/auth'
import { AdminShell } from '@/components/admin-shell'
import { AppColorSchemaScript } from '@/components/providers/app-color-schema-script'
import { AppProvider } from '@/components/providers/app-provider'
import { scopeUserToOrganization } from '@/session'
import { fontClasses } from '@/themes/shadcn/font'
import { mantineHtmlProps } from '@mantine/core'
import '@mantine/tiptap/styles.css'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'SimpleDashboard Template',
  description: 'เทมเพลตแดชบอร์ด SimpleDashboard'
}

type OrganizationLayoutProps = Readonly<{
  children: ReactNode
  params: Promise<{ organizationSlug: string }>
}>

export default async function OrganizationLayout({
  children,
  params
}: OrganizationLayoutProps) {
  const { organizationSlug } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/admin/login')
  }

  const organization = session.organizations.find(
    candidate => candidate.slug === organizationSlug
  )

  if (!organization) {
    notFound()
  }

  const locale = await getLocale()
  const messages = await getMessages()
  const user = scopeUserToOrganization(session.user, organization)

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
          <AppProvider
            preloadedState={{
              auth: { user }
            }}
          >
            <AdminShell
              user={user}
              organizationSlug={organization.slug}
              organizationId={organization.id}
            >
              {children}
            </AdminShell>
          </AppProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
