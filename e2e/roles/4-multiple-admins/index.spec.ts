import { test, expect } from '@playwright/test'
import { ADMIN_ROLE, DEFAULT_ROLE, MODULE } from '@/shared/auth/permissions'
import { ADMIN2_EMAIL, BOOTSTRAP_EMAIL, FREDDY_EMAIL } from '@e2e/constants'
import { ensureUser, getUsuario } from '@e2e/seed'
import ADMIN_API from '@/shared/constants/admin-api'
import emailsWhere from '@e2e/emails-where'
import loginAs from '../login-as'
import openAdmin from '../admin-navigation'

const SERIAL = { mode: 'serial' } as const
const { updateUser: UPDATE_USER, deleteUser: DELETE_USER } = ADMIN_API
const ACTIVE_ADMINS = `rol=eq.${ADMIN_ROLE}&activo=eq.true`
const OWN_ADMINS = [FREDDY_EMAIL, ADMIN2_EMAIL]
const LIST = new Intl.ListFormat('en')
const demote = (id: string) => ({ data: { id, rol: DEFAULT_ROLE } })
const inTheWay = (others: string[]) =>
  `C12 needs ${ADMIN2_EMAIL} to end up the only admin; other admins exist: ${LIST.format(others)}`

// Multiple admins and the last-admin guard. Last in the run: C12 demotes freddy@, and each case
// builds on the DB state the previous one left.
test.describe.configure(SERIAL)

test('C9/C10 · a second, independent admin with its own Auth', async ({ page }) => {
  await ensureUser(ADMIN2_EMAIL, ADMIN_ROLE, 'Admin', 'Dos')
  expect((await getUsuario(ADMIN2_EMAIL))?.rol).toBe(ADMIN_ROLE)
  await loginAs(page, ADMIN2_EMAIL)
  await expect(page.locator(`[data-tour="${MODULE.ADMIN}"]`)).toBeVisible()
  await openAdmin(page)
})

test('C11 · deleting the bootstrap admin leaves the others intact', async ({ page }) => {
  await loginAs(page, ADMIN2_EMAIL)
  const bootId = (await getUsuario(BOOTSTRAP_EMAIL))!.id
  // The real flow: demote first (delete-user refuses to delete admins), then delete.
  const demoted = await page.request.post(UPDATE_USER, demote(bootId))
  expect(demoted.ok()).toBeTruthy()
  const deletion = { data: { id: bootId } }
  const deleted = await page.request.post(DELETE_USER, deletion)
  expect(deleted.ok()).toBeTruthy()
  expect(await getUsuario(BOOTSTRAP_EMAIL)).toBeNull()
  await openAdmin(page)
})

test('C12 · the last-admin guard refuses to demote it', async ({ page }) => {
  // Any admin besides freddy@ and admin2@ (admin@, or one another spec owns) means admin2@ can never
  // be left alone without demoting someone this suite does not own: skip, and name who is in the way.
  const admins = await emailsWhere(ACTIVE_ADMINS)
  const others = admins.filter(email => !OWN_ADMINS.includes(email))
  const crowded = others.length > 0
  test.skip(crowded, inTheWay(others))
  await loginAs(page, ADMIN2_EMAIL)
  const freddyId = (await getUsuario(FREDDY_EMAIL))!.id
  const admin2Id = (await getUsuario(ADMIN2_EMAIL))!.id
  // freddy@ and admin2@ are left: demoting freddy@ is allowed, admin2@ remains.
  const allowed = await page.request.post(UPDATE_USER, demote(freddyId))
  expect(allowed.ok()).toBeTruthy()
  // Now admin2@ is the only one, so demoting it must fail.
  const blocked = await page.request.post(UPDATE_USER, demote(admin2Id))
  expect(blocked.status()).toBe(400)
  expect((await blocked.json()).error).toContain('last admin')
})

// C13 (reassign-and-delete with dependencies) is not automated: it needs seeded activities and
// FKs; the isLastAdmin guard (unit) and C11/C12 cover it.
