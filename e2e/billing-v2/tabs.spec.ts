import { test, expect } from '@playwright/test'
import session from './session'
import screen from './screen'

// The regression the final branch review found: switching tabs used to unmount the calendar,
// which reset whatever month it had been moved to back to today's. `period` now lives above
// both tabs, so it survives the round trip while Overview keeps its own filter state.
const serialBillingTabs: Parameters<typeof test.describe.configure>[0] = { mode: 'serial' }
const exactTextMatch = { exact: true }

test.describe.configure(serialBillingTabs)
session.install()

const NEXT_MONTH = 'octubre de 2026'

test('the calendar\'s month survives a trip to Overview and back', async ({ page }) => {
  await session.openBilling(page)
  const nextMonthButton = { name: NEXT_MONTH, exact: true }
  await page.getByRole('button', nextMonthButton).click()
  await expect(page.getByText(NEXT_MONTH, exactTextMatch)).toBeVisible()

  await screen.tab(page, 'billing.tab.overview').click()
  await expect(page.getByText(screen.say('billing.summary.title'), exactTextMatch)).toBeVisible()

  await screen.tab(page, 'billing.tab.records').click()
  await expect(page.getByText(NEXT_MONTH, exactTextMatch)).toBeVisible()
})
