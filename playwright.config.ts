import { defineConfig, devices } from '@playwright/test'

// E2E de roles dinámicos contra la Supabase LOCAL. Requiere `.env.development.local`
// (apuntando al stack local) y `supabase start`. El dev server se reutiliza si ya corre.
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: false,
  workers: 1, // un solo worker: los tests comparten estado en la DB local y van en serie
  retries: 0,
  // El dev server compila cada ruta en el primer hit; la home es pesada y puede pasar
  // los 30s default. Subimos el techo para que el waitForURL(40s) del login no se cape.
  timeout: 60000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
