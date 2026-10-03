import { test, expect } from '@playwright/test'
import { MODULE, modulePath } from '@/shared/auth/permissions'
import { FREDDY_EMAIL, NUEVO_EMAIL } from '@e2e/constants'
import { getUsuario } from '@e2e/seed'
import loginAs from '../login-as'
import openAdmin from '../admin-navigation'
import assertDenied from '../assert-denied'

const SERIAL = { mode: 'serial' } as const
const ROLES_TAB = { name: 'Roles', exact: true }
const ROLE_SAVED = { timeout: 10000 }
const NUEVO_ROW = { hasText: NUEVO_EMAIL }
const SOPORTE_OPTION = { label: 'Soporte' }
const HACK_ROLE = { data: { label: 'Hack', modules: [] } }
const rail = (slug: string) => `[data-tour="${slug}"]`

// Role CRUD and its effect, then the role protections, which need `soporte` to hold nuevo@.
// Each test builds on the previous one's DB state, so they run in order in this one file.
test.describe.configure(SERIAL)

test('A2 · create role "Soporte" with Directorio only (modal)', async ({ page }) => {
  await loginAs(page, FREDDY_EMAIL)
  await openAdmin(page)
  await page.locator('main').getByRole('button', ROLES_TAB).click()
  // No "+": `Button` renders the icon in an aria-hidden <span>, outside the accessible name.
  await page.getByRole('button', { name: 'Nuevo rol', exact: true }).click()
  await page.getByPlaceholder('Ej. Soporte').fill('Soporte')
  await page.getByRole('button', { name: 'Directorio', exact: true }).click()
  await page.getByRole('button', { name: 'Crear rol' }).click()
  await expect(page.getByTestId('role-soporte')).toBeVisible()
})

test('A3 · assign role Soporte to nuevo@ (row dropdown)', async ({ page }) => {
  await loginAs(page, FREDDY_EMAIL)
  await openAdmin(page)
  await page.locator('tr', NUEVO_ROW).locator('select').selectOption(SOPORTE_OPTION)
  // The first assignment asks for confirmation (ConfirmModal) before applying.
  await page.getByRole('button', { name: 'Asignar rol', exact: true }).click()
  const nuevoRole = async () => (await getUsuario(NUEVO_EMAIL))?.rol
  await expect.poll(nuevoRole, ROLE_SAVED).toBe('soporte')
})

test('A4 · nuevo@ now sees Directorio only', async ({ page }) => {
  await loginAs(page, NUEVO_EMAIL)
  await expect(page.locator(rail(MODULE.DIRECTORIO))).toBeVisible()
  await expect(page.locator(rail(MODULE.ADMIN))).toBeHidden()
  // Directorio through soft navigation (no remount): a click on the rail.
  await page.locator(rail(MODULE.DIRECTORIO)).click()
  await page.waitForURL(`**${modulePath(MODULE.DIRECTORIO)}`)
  await expect(page.getByText('Acceso denegado')).toBeHidden()
  await assertDenied(page, NUEVO_EMAIL, modulePath(MODULE.STRATIX_MKT))
})

test('B6/B7 · admin has no delete button; system and in-use roles disabled', async ({ page }) => {
  await loginAs(page, FREDDY_EMAIL)
  await openAdmin(page)
  await page.locator('main').getByRole('button', ROLES_TAB).click()
  // admin: no button at all; sin_asignar: a system role; soporte: it holds nuevo@.
  await expect(page.getByTestId('del-admin')).toHaveCount(0)
  await expect(page.getByTestId('del-sin_asignar')).toBeDisabled()
  await expect(page.getByTestId('del-soporte')).toBeDisabled()
})

test('B8 · POST /api/admin/roles as a non-admin → 403', async ({ page }) => {
  await loginAs(page, NUEVO_EMAIL)
  const res = await page.request.post('/api/admin/roles', HACK_ROLE)
  expect(res.status()).toBe(403)
})
