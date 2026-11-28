import { test as base, expect, type BrowserContext, type Page } from '@playwright/test'
import { ensureUser } from './seed'
import loginAs from '@e2e/roles/login-as'
import { NAV } from '../src/shared/components/shell/appShellConfig'
import { modulePath } from '../src/shared/auth/permissions'
import { HOME_TEXT } from '@e2e/billing-v2/constants'

// Smoke test: como admin (ve todos los módulos), recorre cada uno y verifica que
// CARGA sin crashear — no prueba features a fondo, solo "¿prende sin humo?".
// Caza roturas de runtime (import roto, provider faltante, crash de render) que
// tsc no ve. Navega client-side (click en el rail) para no disparar la carrera de
// sesión del goto de página completa.

const FREDDY = 'freddy@eminat.net'

// Derivado de NAV (fuente única del rail): [data-tour key, ruta]. Auto-cubre módulos
// nuevos. finanzas no está en NAV (sin ícono de rail) → no se recorre, como antes.
const MODULES = NAV.filter(n => n.slug !== 'sales').map(n => [n.key, modulePath(n.slug)] as const)

type SmokeState = Awaited<ReturnType<BrowserContext['storageState']>>

// Authenticate through the real UI once per worker, then give every test a fresh
// context initialized from the same in-memory snapshot. Never write auth state.
// Other specs can change roles, so reassert admin when this worker fixture starts.
const test = base.extend<Record<never, never>, { smokeStorageState: SmokeState }>({
  smokeStorageState: [async ({ browser }, use, workerInfo) => {
    await ensureUser(FREDDY, 'admin', 'Freddy', 'Admin')
    const context = await browser.newContext({ baseURL: workerInfo.project.use.baseURL, storageState: undefined })
    try {
      const page = await context.newPage()
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await loginAs(page, FREDDY)
      expect(errors, 'runtime errors during smoke authentication').toHaveLength(0)
      await use(await context.storageState())
    } finally {
      await context.close()
    }
  }, { scope: 'worker' }],
  storageState: async ({ smokeStorageState }, use) => { await use(smokeStorageState) },
})

async function openSmokeHome(page: Page) {
  await page.goto('/')
  // Preserve loginAs's profile-loaded condition before client-side rail navigation.
  await expect(page.getByText(HOME_TEXT, { exact: true })).toBeVisible({ timeout: 20_000 })
}

// Each cold route gets the existing bounded test budget instead of sharing one
// 60-second deadline across login and every module. Keep all navigation assertions.
for (const [key, path] of MODULES) {
  test(`smoke · ${key} carga para admin sin crashear`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))

    await openSmokeHome(page)
    await expect(page.locator('[data-tour="sales"]')).toHaveCount(0)

    await page.locator(`[data-tour="${key}"]`).click()
    await page.waitForURL(`**${path}`)
    // no gateado y el shell sigue vivo (no white-screen)
    await expect(page.getByText('Acceso denegado')).toBeHidden()
    // Some modules briefly remount the shell while their first data request loads.
    await expect(page.locator('[data-tour="home"]')).toBeVisible({ timeout: 30_000 })

    expect(errors, `errores de runtime en ${key}: ${errors.join(' | ')}`).toHaveLength(0)
  })
}

test('smoke · sales remains unavailable without the native-primary switch', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await openSmokeHome(page)
  await expect(page.locator('[data-tour="sales"]')).toHaveCount(0)
  // Even admin cannot reach /sales when the native-primary switch is absent.
  const denied = await page.goto('/sales')
  expect(denied?.status()).toBe(404)

  expect(errors, `errores de runtime en módulos: ${errors.join(' | ')}`).toHaveLength(0)
})
