import { test, expect, Page } from '@playwright/test'
import { PASSWORD, ensureUser } from './seed'
import { MODULE, modulePath } from '../src/shared/auth/permissions'

// Con una cuenta que NO es admin: `has_module()` abre con `is_admin() OR …`, así que probar el
// gate con un admin le da true a cualquier slug, incluso a uno mal escrito. stratix360 tiene el
// módulo `operations` (local y prod); medico no lo tiene en ninguna de las dos — sirve de negativo.
const CON_MODULO = 'ops.stratix@eminat.net'
const SIN_MODULO = 'ops.medico@eminat.net'

const HOME_URL = 'http://localhost:3000/'

// Sin `mode: 'serial'`: los tests no comparten estado (usuarios distintos, login propio) y
// `playwright.config.ts` ya corre todo con `workers: 1`. `serial` frenaría al segundo si el
// primero falla, y acá los dos son informativos por separado (positivo y negativo del gate).

test.beforeAll(async () => {
  await ensureUser(CON_MODULO, 'stratix360')
  await ensureUser(SIN_MODULO, 'medico')
})

// Mismo helper que roles.spec.ts / smoke.spec.ts (duplicado a propósito: mantiene este spec
// autónomo).
async function loginAs(page: Page, email: string) {
  await page.context().clearCookies()
  await page.goto('/login')
  try { await page.evaluate(() => localStorage.clear()) } catch {}
  await page.goto('/login')
  await page.getByPlaceholder('tu@eminat.net').fill(email)
  const pw = page.locator('input[type="password"]')
  await pw.fill(PASSWORD)
  await pw.press('Enter')
  await page.waitForURL(HOME_URL, { timeout: 40000 })
  // Esperar a que loadProfile termine (sesión persistida) ANTES de navegar: un fallo
  // transitorio dispararía el signOut destructivo del AppContext.
  await expect(page.getByText('Home', { exact: true })).toBeVisible({ timeout: 20000 })
}

test('un rol con el módulo ve el tablero en /operations', async ({ page }) => {
  await loginAs(page, CON_MODULO)
  await page.goto(modulePath(MODULE.OPERATIONS))
  await expect(page.getByText('Acceso denegado')).toBeHidden()
  // Título que sólo pone `ModuloTabs` si `TasksModule` monta de verdad (tab inicial: 'kanban' →
  // 'Production'). `AccessDenied` cae al autoTitle de la ruta ('Operations — Tareas del grupo'),
  // un string distinto — distingue "gate abierto" de "gate roto con shell puesto".
  await expect(page.getByText('Operations — Production', { exact: true })).toBeVisible({ timeout: 20000 })
})

test('un rol sin el módulo recibe AccessDenied, no una pantalla vacía', async ({ page }) => {
  await loginAs(page, SIN_MODULO)
  await page.goto(modulePath(MODULE.OPERATIONS))
  await expect(page.getByText('Acceso denegado')).toBeVisible({ timeout: 20000 })
})
