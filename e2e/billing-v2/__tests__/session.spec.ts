import { test, expect } from '@playwright/test'
import expectOpaque from '../opacity'
import screen from '../screen'
import session from '../session'
import { APP_HOME, HOLDER_EMAIL, TODAY } from '../constants'

session.install()

test('loginAs leaves the user on the launchpad', async ({ page }) => {
  await session.loginAs(page, HOLDER_EMAIL)
  await expect(page).toHaveURL(APP_HOME)
})

// openBilling itself fails unless the page has faded in: it checks the heading is opaque.
test('openBilling reaches a billing screen that reads the pinned day', async ({ page }) => {
  await session.openBilling(page)
  const shown = await page.evaluate(() => new Date().toDateString())
  expect(shown).toBe(TODAY.toDateString())
})

// A reload is where a faked animation clock used to leave the page at opacity 0.
test('billing is still seen after a reload', async ({ page }) => {
  await session.openBilling(page)
  await page.reload()
  await expectOpaque(screen.defaultHeading(page))
})
