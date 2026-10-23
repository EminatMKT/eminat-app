import { test, expect } from '@playwright/test'
import { ensureUser } from './seed'
import loginAs from '@e2e/roles/login-as'
import { NAV } from '../src/shared/components/shell/appShellConfig'
import { modulePath } from '../src/shared/auth/permissions'

// Smoke test: como admin (ve todos los módulos), recorre cada uno y verifica que
// CARGA sin crashear — no prueba features a fondo, solo "¿prende sin humo?".
// Caza roturas de runtime (import roto, provider faltante, crash de render) que
// tsc no ve. Navega client-side (click en el rail) para no disparar la carrera de
// sesión del goto de página completa.

const FREDDY = 'freddy@eminat.net'

// Derivado de NAV (fuente única del rail): [data-tour key, ruta]. Auto-cubre módulos
// nuevos. finanzas no está en NAV (sin ícono de rail) → no se recorre, como antes.
const MODULES = NAV.filter(n => n.slug !== 'sales').map(n => [n.key, modulePath(n.slug)] as const)

// freddy debe ser admin (otros specs lo degradan); lo reaseguramos para correr en cualquier orden.
test.beforeAll(async () => { await ensureUser(FREDDY, 'admin', 'Freddy', 'Admin') })

test('smoke · cada módulo carga para admin sin crashear', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  await loginAs(page, FREDDY)
  await expect(page.locator('[data-tour="sales"]')).toHaveCount(0)

  for (const [key, path] of MODULES) {
    await page.locator(`[data-tour="${key}"]`).click()
    await page.waitForURL(`**${path}`)
    // no gateado y el shell sigue vivo (no white-screen)
    await expect(page.getByText('Acceso denegado')).toBeHidden()
    // Some modules briefly remount the shell while their first data request loads.
    await expect(page.locator('[data-tour="home"]')).toBeVisible({ timeout: 30_000 })
  }

  // Even admin cannot reach the QA-only route when the server switch is absent.
  const denied = await page.goto('/sales')
  expect(denied?.status()).toBe(404)

  expect(errors, `errores de runtime en módulos: ${errors.join(' | ')}`).toHaveLength(0)
})
