import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './e2e/report-only', testMatch: 'reports.spec.ts', timeout: 60000,
  workers: 1, retries: 0, reporter: 'list',
  use: { baseURL: 'http://localhost:3138', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'node e2e/report-only/server.mjs', url: 'http://localhost:3138/__qa', reuseExistingServer: false, timeout: 120000 },
})
