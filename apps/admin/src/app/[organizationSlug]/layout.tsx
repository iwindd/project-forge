import { auth } from '@/auth'
import { AdminShell } from '@/components/admin-shell'
import { AppColorSchemaScript } from '@/components/providers/app-color-schema-script'
import { AdminUIProvider } from '@/components/providers/mantine-provider'
import { apiServerFetch } from '@/lib/api-server'
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

  if (session.user.activeOrganizationId !== organization.id) {
    try {
      await apiServerFetch(
        `organizations/${encodeURIComponent(organization.id)}/switch`,
        { method: 'POST' }
      )
    } catch {
      notFound()
    }
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
        <AppColorSchemaScript />
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
            >
              {children}
            </AdminShell>
          </AdminUIProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
