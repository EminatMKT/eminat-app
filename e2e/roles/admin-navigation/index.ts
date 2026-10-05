import type { Page } from '@playwright/test'
import { MODULE, modulePath } from '@/shared/auth/permissions'
import { BUTTON, MAIN_ELEMENT } from '@/shared/constants/dom'

const ADMIN_RAIL_LINK = `[data-tour="${MODULE.ADMIN}"]`
const ADMIN_URL = `**${modulePath(MODULE.ADMIN)}`
const ROLES_TAB = { name: 'Roles', exact: true }

/** Opens the admin panel from the rail and waits for its Roles tab. */
export default async function openAdmin(page: Page) {
  await page.locator(ADMIN_RAIL_LINK).click()
  await page.waitForURL(ADMIN_URL)
  await page.locator(MAIN_ELEMENT).getByRole(BUTTON, ROLES_TAB).waitFor()
}

// Client-side navigation to the admin panel: the provider stays mounted, so there is no remount or
// profile reload, which avoids the session race a full-page goto runs into.
