import { expect, type Page } from '@playwright/test'
import { ENTER } from '@/shared/constants/dom'
import { PASSWORD } from '@e2e/seed'
import { HOME_TEXT, LOGIN_PATH, LOGIN_PLACEHOLDER, ONBOARDING_DONE } from '@e2e/billing-v2/constants'

const HOME_PATH = '/'
const PASSWORD_INPUT = 'input[type="password"]'
const EXACT = { exact: true }
const LOGIN_WAIT = { timeout: 40000 }
const PROFILE_WAIT = { timeout: 20000 }
const CLEAR_ORIGIN = 'Storage.clearDataForOrigin'
const LOCAL_STORAGE = 'local_storage'

/** Logs in from a clean session and waits until the profile has loaded. */
export default async function loginAs(page: Page, email: string) {
  await page.context().clearCookies()
  await page.goto(LOGIN_PATH)
  const origin = new URL(page.url()).origin
  const clearLocal = { origin, storageTypes: LOCAL_STORAGE }
  const devtools = await page.context().newCDPSession(page)
  await devtools.send(CLEAR_ORIGIN, clearLocal)
  await devtools.detach()
  await page.evaluate(([key, done]) => localStorage.setItem(key, done), ONBOARDING_DONE)
  await page.goto(LOGIN_PATH)
  await page.getByPlaceholder(LOGIN_PLACEHOLDER).fill(email)
  const password = page.locator(PASSWORD_INPUT)
  await password.fill(PASSWORD)
  await password.press(ENTER)
  await page.waitForURL(HOME_PATH, LOGIN_WAIT)
  // Wait for loadProfile (persisted session) BEFORE navigating: a transient failure would fire the
  // AppContext's destructive signOut.
  await expect(page.getByText(HOME_TEXT, EXACT)).toBeVisible(PROFILE_WAIT)
}

// Logs a roles e2e user in from scratch: cookies and the origin's saved state are wiped first, so a
// previous user's session never leaks into the next login. The origin's storage is cleared through
// the browser's devtools protocol rather than from the page, and the e2e project runs Chromium only.
// The onboarding flag is set right after: its first-visit tour overlay otherwise covers the rail
// and swallows the admin-navigation clicks.
