import { test, expect } from '@playwright/test'
import { getUsuario } from './seed'
import { RAIL_ADMIN, RAIL_DIRECTORIO, DIRECTORIO_PATH, STRATIX_PATH } from './constants'
import ui from './ui'

// E2E de roles dinámicos: gating (A) y protección de roles (B). Serial: comparten estado en la
// DB local. Los helpers de navegación viven en `ui.ts`, compartidos con `roles-admins.spec.ts`.
test.describe.configure({ mode: 'serial' })

const FREDDY = 'freddy@eminat.net'
const NUEVO = 'nuevo@eminat.net'

// ── A. Gating ──────────────────────────────────────────────────────────────
test('A1 · admin ve módulos; Home no auto-abre submenú', async ({ page }) => {
  await ui.loginAs(page, FREDDY)
  await expect(page.locator(RAIL_ADMIN)).toBeVisible()
  await expect(page.locator(RAIL_DIRECTORIO)).toBeVisible()
  await expect(page.getByText('Production', { exact: true })).toBeHidden()
})

test('A5 · sin_asignar: solo Home, módulos bloqueados', async ({ page }) => {
  await ui.loginAs(page, NUEVO)
  await expect(page.locator(RAIL_DIRECTORIO)).toBeHidden()
  await expect(page.locator(RAIL_ADMIN)).toBeHidden()
  await ui.assertDenied(page, NUEVO, STRATIX_PATH)
})

// A6 y A7 —el alta de usuario y el reset de clave por la API admin— viven en
// `roles-usuarios.spec.ts`: son rutas de Auth, no gating.

// ── A2/A3/A4. CRUD de rol + efecto ───────────────────────────────────────────
test('A2 · crear rol "Soporte" con solo Directorio (modal)', async ({ page }) => {
  await ui.loginAs(page, FREDDY)
  await ui.openAdmin(page)
  await page.locator('main').getByRole('button', { name: 'Roles', exact: true }).click()
  // Sin el "+": el ícono lo pone `Button` en un <span aria-hidden>, así que no forma parte del
  // nombre accesible. Buscar "+ Nuevo rol" era buscar lo que se VE; esto busca lo que anuncia un
  // lector de pantalla. Antes coincidían porque el símbolo vivía dentro de la clave de i18n.
  await page.getByRole('button', { name: 'Nuevo rol', exact: true }).click()
  await page.getByPlaceholder('Ej. Soporte').fill('Soporte')
  await page.getByRole('button', { name: 'Directorio', exact: true }).click()
  await page.getByRole('button', { name: 'Crear rol' }).click()
  await expect(page.getByTestId('role-soporte')).toBeVisible()
})

test('A3 · asignar rol Soporte a nuevo@ (dropdown de la fila)', async ({ page }) => {
  await ui.loginAs(page, FREDDY)
  await ui.openAdmin(page)
  const row = page.locator('tr', { hasText: NUEVO })
  await row.locator('select').selectOption({ label: 'Soporte' })
  // La asignación inicial ahora pide confirmación (ConfirmModal) antes de aplicar.
  await page.getByRole('button', { name: 'Asignar rol', exact: true }).click()
  await expect.poll(async () => (await getUsuario(NUEVO))?.rol, { timeout: 10000 }).toBe('soporte')
})

test('A4 · nuevo@ ahora ve solo Directorio', async ({ page }) => {
  await ui.loginAs(page, NUEVO)
  await expect(page.locator(RAIL_DIRECTORIO)).toBeVisible()
  await expect(page.locator(RAIL_ADMIN)).toBeHidden()
  // Directorio accesible vía soft-nav (sin remount): click en el rail
  await page.locator(RAIL_DIRECTORIO).click()
  await page.waitForURL(`**${DIRECTORIO_PATH}`)
  await expect(page.getByText('Acceso denegado')).toBeHidden()
  // Stratix denegado (helper robusto con re-login)
  await ui.assertDenied(page, NUEVO, STRATIX_PATH)
})

// ── B. Protección de roles ───────────────────────────────────────────────────
test('B6/B7 · admin sin botón borrar; sistema y rol-con-usuarios deshabilitados', async ({ page }) => {
  await ui.loginAs(page, FREDDY)
  await ui.openAdmin(page)
  await page.locator('main').getByRole('button', { name: 'Roles', exact: true }).click()
  await expect(page.getByTestId('del-admin')).toHaveCount(0)        // admin: ni botón
  await expect(page.getByTestId('del-sin_asignar')).toBeDisabled()  // sistema
  await expect(page.getByTestId('del-soporte')).toBeDisabled()      // tiene a nuevo@
})

test('B8 · POST /api/admin/roles como no-admin → 403', async ({ page }) => {
  await ui.loginAs(page, NUEVO)
  const res = await page.request.post('/api/admin/roles', { data: { label: 'Hack', modules: [] } })
  expect(res.status()).toBe(403)
})

// La sección C —varios admins conviviendo y el guard de último admin— se mudó a
// `roles-admins.spec.ts` cuando este archivo pasó el techo de tamaño.
