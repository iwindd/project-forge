import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5051',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome']
  },
  webServer: [
    {
      command: 'node e2e/mock-api-server.mjs',
      url: 'http://127.0.0.1:5050/api/v1/auth/me',
      reuseExistingServer: false,
      timeout: 30_000
    },
    {
      command: 'pnpm dev',
      url: 'http://127.0.0.1:5051/admin/login',
      reuseExistingServer: false,
      timeout: 120_000,
      env: { NEXT_PUBLIC_API_URL: 'http://127.0.0.1:5050' }
    }
  ]
})
