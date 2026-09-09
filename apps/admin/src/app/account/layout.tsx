import { ADMIN_COLOR_SCHEME_KEY } from "@/lib/constants";
import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/page-header";
import { AdminUIProvider } from "@/components/providers/admin-ui-provider";
import { ProfileProvider } from "@/app/admin/(main)/profile/components/profile-context";
import { auth } from "@/auth";
import { getProfile } from "@/servers/profile/queries/get-profile";
import { ColorSchemeScript, Container, mantineHtmlProps } from "@mantine/core";
import "@mantine/tiptap/styles.css";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Prompt, Sarabun } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import "../admin/admin.css";

const prompt = Prompt({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin", "thai"],
  variable: "--font-prompt",
  display: "swap",
});

const sarabun = Sarabun({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  variable: "--font-sarabun",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "บัญชีของฉัน | SimpleDashboard",
  description: "จัดการบัญชีและประวัติการทำรายการของคุณ",
};

export default async function AccountLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  const organization =
    session.organizations.find(
      (candidate) => candidate.id === session.user.activeOrganizationId,
    ) ?? session.organizations[0];

  if (!organization) {
    redirect("/admin/login?error=organization_unavailable");
  }

  const profile = await getProfile();

  if (!profile) {
    notFound();
  }

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      {...mantineHtmlProps}
      suppressHydrationWarning
      className={`${prompt.variable} ${sarabun.variable} ${sarabun.className}`}
    >
      <head>
        <ColorSchemeScript
          defaultColorScheme="auto"
          localStorageKey={ADMIN_COLOR_SCHEME_KEY}
        />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AdminUIProvider
            preloadedState={{
              auth: { user: session.user },
            }}
          >
            <AdminShell
              user={session.user}
              organizationSlug={organization.slug}
              navigationMode="account"
            >
              <ProfileProvider profile={profile}>
                <Container w="100%" size="xl">
                  <PageHeader title="บัญชีของฉัน" />
                  {children}
                </Container>
              </ProfileProvider>
            </AdminShell>
          </AdminUIProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
