import type { Metadata } from 'next';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import { Prompt, Sarabun } from 'next/font/google';
import { ADMIN_COLOR_SCHEME_KEY } from '@/admin/constants';
import './globals.css';
import { AppProviders } from './providers';

const prompt = Prompt({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin', 'thai'],
  variable: '--font-prompt',
  display: 'swap',
});

const sarabun = Sarabun({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin', 'thai'],
  variable: '--font-sarabun',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Project Forge',
  description: 'Private project workspace',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang='th'
      {...mantineHtmlProps}
      suppressHydrationWarning
      className={`${prompt.variable} ${sarabun.variable} ${sarabun.className}`}
    >
      <head>
        <ColorSchemeScript defaultColorScheme='auto' localStorageKey={ADMIN_COLOR_SCHEME_KEY} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
