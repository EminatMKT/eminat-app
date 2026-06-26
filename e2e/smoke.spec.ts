import { test, expect, Page } from '@playwright/test'
import { PASSWORD, ensureUser } from './seed'
import { NAV } from '../shared/components/appShellConfig'
import { modulePath } from '../shared/auth/permissions'

// Smoke test: como admin (ve todos los módulos), recorre cada uno y verifica que
// CARGA sin crashear — no prueba features a fondo, solo "¿prende sin humo?".
// Caza roturas de runtime (import roto, provider faltante, crash de render) que
// tsc no ve. Navega client-side (click en el rail) para no disparar la carrera de
// sesión del goto de página completa.

const FREDDY = 'freddy@eminat.net'

// Derivado de NAV (fuente única del rail): [data-tour key, ruta]. Auto-cubre módulos
// nuevos. finanzas no está en NAV (sin ícono de rail) → no se recorre, como antes.
const MODULES = NAV.map(n => [n.key, modulePath(n.slug)] as const)

// Mismo helper que roles.spec.ts (duplicado a propósito: mantiene este spec autónomo).
async function loginAs(page: Page, email: string) {
  await page.context().clearCookies()
  await page.goto('/login')
  try { await page.evaluate(() => localStorage.clear()) } catch {}
  await page.goto('/login')
  await page.getByPlaceholder('tu@eminat.net').fill(email)
  const pw = page.locator('input[type="password"]')
  await pw.fill(PASSWORD)
  await pw.press('Enter')
  await page.waitForURL('http://localhost:3000/', { timeout: 40000 })
  await expect(page.getByText('Home', { exact: true })).toBeVisible({ timeout: 20000 })
}

// freddy debe ser admin (otros specs lo degradan); lo reaseguramos para correr en cualquier orden.
test.beforeAll(async () => { await ensureUser(FREDDY, 'admin', 'Freddy', 'Admin') })

test('smoke · cada módulo carga para admin sin crashear', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  await loginAs(page, FREDDY)

  for (const [key, path] of MODULES) {
    await page.locator(`[data-tour="${key}"]`).click()
    await page.waitForURL(`**${path}`)
    // no gateado y el shell sigue vivo (no white-screen)
    await expect(page.getByText('Acceso denegado')).toBeHidden()
    await expect(page.locator('[data-tour="home"]')).toBeVisible()
  }

  expect(errors, `errores de runtime en módulos: ${errors.join(' | ')}`).toHaveLength(0)
})
