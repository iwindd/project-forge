import { ADMIN_COLOR_SCHEME_KEY } from "@/admin/constants";
import { AdminShell } from "@/admin/components/admin-shell";
import { AdminUIProvider } from "@/admin/providers/admin-ui-provider";
import { apiServerFetch } from "@/lib/api-server";
import { auth } from "@/auth";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
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
  title: "SimpleDashboard Template",
  description: "เทมเพลตแดชบอร์ด SimpleDashboard",
};

type OrganizationLayoutProps = Readonly<{
  children: ReactNode;
  params: Promise<{ organizationSlug: string }>;
}>;

export default async function OrganizationLayout({
  children,
  params,
}: OrganizationLayoutProps) {
  const { organizationSlug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  const organization = session.organizations.find(
    (candidate) => candidate.slug === organizationSlug,
  );

  if (!organization) {
    notFound();
  }

  if (session.user.activeOrganizationId !== organization.id) {
    try {
      await apiServerFetch(
        `organizations/${encodeURIComponent(organization.id)}/switch`,
        { method: "POST" },
      );
    } catch {
      notFound();
    }
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
            >
              {children}
            </AdminShell>
          </AdminUIProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
