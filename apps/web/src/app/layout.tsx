import type { Metadata } from 'next';
import '@mantine/core/styles.css';
import './globals.css';
import { AppProviders } from './providers';

export const metadata: Metadata = {
  title: 'Project Forge',
  description: 'Private project workspace',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='th'>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
