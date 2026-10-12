import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'meetings-synthetic.spec.ts',
  timeout: 60000,
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 30000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'dummy-anon-key',
      SUPABASE_SECRET_KEY: 'dummy-secret',
      NEXT_PUBLIC_APP_ENV: 'local',
    },
  },
})
