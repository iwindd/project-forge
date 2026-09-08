import { ADMIN_COLOR_SCHEME_KEY } from "@/admin/constants";
import { AdminUIProvider } from "@/admin/providers/admin-ui-provider";
import { auth } from "@/auth";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import "@mantine/tiptap/styles.css";
import type { Metadata } from "next";
import { Prompt, Sarabun } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./admin.css";

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

export const metadata: Metadata = {
  title: "SimpleDashboard Template",
  description: "เทมเพลตแดชบอร์ด SimpleDashboard",
};

export default async function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
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
        {/*
         * mantineHtmlProps hard-codes data-mantine-color-scheme="light" on the
         * server, so without this blocking inline script every admin page paints
         * light first and only turns dark after hydration. The key and default
         * must stay in sync with the colorSchemeManager in AdminUIProvider.
         */}
        <ColorSchemeScript
          defaultColorScheme="auto"
          localStorageKey={ADMIN_COLOR_SCHEME_KEY}
        />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AdminUIProvider
            preloadedState={{
              auth: { user: session?.user ?? null },
            }}
          >
            {children}
          </AdminUIProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
