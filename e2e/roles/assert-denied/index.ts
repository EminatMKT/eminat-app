import { expect, type Page } from '@playwright/test'
import loginAs from '../login-as'

const DENIED_TEXT = 'Acceso denegado'
const DENIED_WAIT = { timeout: 8000 }
const RETRIES = { timeout: 45000, intervals: [500, 1500, 3000] }

/** Asserts that `email` gets "Access denied" on the gated `path`, re-logging fresh on every retry. */
export default async function assertDenied(page: Page, email: string, path: string) {
  const attempt = async () => {
    await loginAs(page, email)
    await page.goto(path)
    await expect(page.getByText(DENIED_TEXT)).toBeVisible(DENIED_WAIT)
  }
  await expect(attempt).toPass(RETRIES)
}

// Checks "Access denied" on a gated route. A full-page goto remounts the provider, and a transient
// loadProfile failure fires the destructive (sticky) signOut. So every toPass retry logs in fresh:
// each attempt starts from a new session.
