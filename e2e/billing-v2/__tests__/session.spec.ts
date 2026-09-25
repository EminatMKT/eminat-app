import { test, expect } from '@playwright/test'
import session from '../session'
import { APP_HOME, HOLDER_EMAIL, TODAY } from '../constants'

session.install()

test('loginAs leaves the user on the launchpad', async ({ page }) => {
  await session.loginAs(page, HOLDER_EMAIL)
  await expect(page).toHaveURL(APP_HOME)
})

test('openBilling reaches the billing screen with the clock frozen', async ({ page }) => {
  await session.openBilling(page)
  expect(await page.evaluate(() => Date.now())).toBe(TODAY.getTime())
})
