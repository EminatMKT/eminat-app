import { test, expect } from '@playwright/test'
import session from './session'
import screen from './screen'

// The regression the final branch review found: switching tabs used to unmount the calendar,
// which reset whatever month it had been moved to back to today's. `period` now lives above
// both tabs, so it survives the round trip — and Overview reads the same month Records has open.
test.describe.configure({ mode: 'serial' })
session.install()

const NEXT_MONTH = 'octubre de 2026'

test('the calendar\'s month survives a trip to Overview and back, and Overview reads it too', async ({ page }) => {
  await session.openBilling(page)
  await page.getByRole('button', { name: NEXT_MONTH, exact: true }).click()
  await expect(page.getByText(NEXT_MONTH, { exact: true })).toBeVisible()

  await screen.press(page, 'billing.tab.overview')
  await expect(page.getByText(NEXT_MONTH, { exact: true })).toBeVisible()

  await screen.press(page, 'billing.tab.records')
  await expect(page.getByText(NEXT_MONTH, { exact: true })).toBeVisible()
})
