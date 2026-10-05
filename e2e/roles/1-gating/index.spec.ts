import { test, expect } from '@playwright/test'
import { MODULE, modulePath } from '@/shared/auth/permissions'
import { FREDDY_EMAIL, NUEVO_EMAIL } from '@e2e/constants'
import loginAs from '../login-as'
import assertDenied from '../assert-denied'

const SERIAL = { mode: 'serial' } as const
const EXACT = { exact: true }
const rail = (slug: string) => `[data-tour="${slug}"]`

// The numeric prefix is the run order: A5 needs nuevo@ still `sin_asignar`, before 3-role-crud.
test.describe.configure(SERIAL)

test('A1 · admin sees the modules; Home does not auto-open a submenu', async ({ page }) => {
  await loginAs(page, FREDDY_EMAIL)
  await expect(page.locator(rail(MODULE.ADMIN))).toBeVisible()
  await expect(page.locator(rail(MODULE.DIRECTORIO))).toBeVisible()
  await expect(page.getByText('Production', EXACT)).toBeHidden()
})

test('A5 · sin_asignar: Home only, modules blocked', async ({ page }) => {
  await loginAs(page, NUEVO_EMAIL)
  await expect(page.locator(rail(MODULE.DIRECTORIO))).toBeHidden()
  await expect(page.locator(rail(MODULE.ADMIN))).toBeHidden()
  await assertDenied(page, NUEVO_EMAIL, modulePath(MODULE.STRATIX_MKT))
})
