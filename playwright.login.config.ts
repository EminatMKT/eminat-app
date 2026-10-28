import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: ['login-visual.spec.ts', 'admin-row-menu.spec.ts', 'security-headers.spec.ts'],
  timeout: 30000,
  use: { baseURL: process.env.LOGIN_PREVIEW_URL || 'http://localhost:3107', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.LOGIN_PREVIEW_URL ? undefined : {
    command: 'node_modules/.bin/next start -p 3107',
    url: 'http://localhost:3107/login',
    reuseExistingServer: false,
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'dummy-anon-key', NEXT_PUBLIC_APP_ENV: 'local', SUPABASE_SECRET_KEY: 'dummy-secret' },
  },
})
