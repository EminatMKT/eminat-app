import { test, expect } from '@playwright/test'
import { MODULE, modulePath } from '@/shared/auth/permissions'
import session from './session'
import screen from './screen'
import { APP_HOME, HOLDER_EMAIL, LOGIN_PATH, OUTSIDER_EMAIL } from './constants'

// The route cutover: the stored permission stays `cobranzas`, only its public path moved.
// Both users are non-admins on purpose — an admin short-circuits every module check.
test.describe.configure({ mode: 'serial' })
session.install()

const BILLING = modulePath(MODULE.COBRANZAS)
const OLD_PATH = `/${MODULE.COBRANZAS}`
const NOT_FOUND = 404
const TEMPORARY_REDIRECT = 307

test('a holder of the module reaches /billing from the rail', async ({ page }) => {
  await session.openBilling(page)
  await expect(page).toHaveURL(new RegExp(`${BILLING}$`))
  await expect(page.getByRole('heading', { name: screen.say('billing.reminders.overdue'), exact: true })).toBeVisible()
})

test('a user without the module is denied at /billing', async ({ page }) => {
  await expect(async () => {
    await session.loginAs(page, OUTSIDER_EMAIL)
    await page.goto(BILLING)
    await expect(page.getByText(screen.say('common.accessDenied'), { exact: true })).toBeVisible({ timeout: 8000 })
  }).toPass({ timeout: 45000, intervals: [500, 1500, 3000] })
  // The shared route gate answers first, through moduleForPath('/billing'): no billing screen mounts.
  await expect(page.getByRole('heading', { name: screen.say('billing.title'), exact: true })).toHaveCount(0)
})

test('the old path is an ordinary 404 for a signed-in user, with no redirect', async ({ page }) => {
  await session.loginAs(page, HOLDER_EMAIL)
  const res = await page.goto(OLD_PATH)
  expect(res?.status()).toBe(NOT_FOUND)
  expect(res?.request().redirectedFrom()).toBeNull()
  expect(new URL(page.url()).pathname).toBe(OLD_PATH)
})

test('anonymous requests still go to login, on the old path and the new one', async ({ request }) => {
  for (const path of [BILLING, OLD_PATH]) {
    const res = await request.get(path, { maxRedirects: 0 })
    expect(res.status(), path).toBe(TEMPORARY_REDIRECT)
    expect(new URL(res.headers().location, APP_HOME).pathname, path).toBe(LOGIN_PATH)
  }
})
