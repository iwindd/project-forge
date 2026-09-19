import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['forge.iwindd.dev'],
  experimental: {
    // Keep static-generation workers stable on the Windows build environment.
    cpus: 4,
    // Avoid reusing stale Turbopack CSS-module graphs after organization-route
    // moves. The dev cache can otherwise keep a second source-root hash alive.
    turbopackFileSystemCacheForDev: false,
    // Required for the route-group root layout in `src/app/(web)/layout.tsx`.
    // The app intentionally has no `src/app/layout.tsx`, so unmatched URLs
    // need a global fallback that can render its own document.
    globalNotFound: true,
    optimizePackageImports: ['@mantine/core', '@mantine/hooks', '@tabler/icons-react'],
  },
};

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

export default withNextIntl(nextConfig);
