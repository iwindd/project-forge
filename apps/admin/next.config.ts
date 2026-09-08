import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Keep static-generation workers stable on the Windows build environment.
    cpus: 4,
    // Avoid reusing stale Turbopack CSS-module graphs after organization-route
    // moves. The dev cache can otherwise keep a second source-root hash alive.
    turbopackFileSystemCacheForDev: false,
    // Required for `src/app/global-not-found.tsx`. The app has two separate root
    // layouts ((web) and admin) and no app/layout.tsx, so unmatched URLs have no
    // layout to compose a 404 from and would otherwise fall back to Next.js's
    // built-in page. Route-level notFound() still uses (web)/not-found.tsx.
    globalNotFound: true,
    optimizePackageImports: [
      "@mantine/core",
      "@mantine/hooks",
      "@tabler/icons-react",
    ],
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
