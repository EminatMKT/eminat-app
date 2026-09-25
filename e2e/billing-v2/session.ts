import { test, expect, type Page } from '@playwright/test'
import { MODULE, modulePath } from '@/shared/auth/permissions'
import { NAV } from '@/shared/components/shell/appShellConfig/nav'
import { ENTER, HEADING } from '@/shared/constants/dom'
import { PASSWORD, ensureUser, deleteUser } from '../seed'
import records from './records'
import screen from './screen'
import * as K from './constants'

const railKey = NAV.find((item) => item.slug === MODULE.COBRANZAS)?.key

async function loginAs(page: Page, email: string) {
  await page.context().clearCookies()
  await page.goto(K.LOGIN_PATH)
  try {
    await page.evaluate(([key, done]) => { localStorage.clear(); localStorage.setItem(key, done) }, K.ONBOARDING_DONE)
  } catch {}
  await page.goto(K.LOGIN_PATH)
  await page.getByPlaceholder(K.LOGIN_PLACEHOLDER).fill(email)
  const password = page.locator(K.PASSWORD_BOX)
  await password.fill(PASSWORD)
  await password.press(ENTER)
  await page.waitForURL(K.APP_HOME, K.LOGIN_WAIT)
  await expect(page.getByText(K.HOME_TEXT, { exact: true })).toBeVisible(K.PROFILE_WAIT)
}

async function openBilling(page: Page) {
  await page.clock.setFixedTime(K.TODAY)
  await loginAs(page, K.HOLDER_EMAIL)
  await page.locator(`[data-tour="${railKey}"]`).click()
  await page.waitForURL(`**${modulePath(MODULE.COBRANZAS)}`)
  await expect(page.getByRole(HEADING, { level: 2, name: screen.say('billing.title'), exact: true })).toBeVisible()
}

function install() {
  test.beforeAll(async ({ request }) => {
    await ensureUser(K.HOLDER_EMAIL, K.HOLDER_ROLE, ...K.HOLDER_NAME)
    await ensureUser(K.OUTSIDER_EMAIL, K.OUTSIDER_ROLE, ...K.OUTSIDER_NAME)
    await records.signIn(request)
  })
  test.afterEach(async ({ request }) => { await records.clear(request) })
  test.afterAll(async () => { await deleteUser(K.HOLDER_EMAIL); await deleteUser(K.OUTSIDER_EMAIL) })
}

/** Who the billing e2e runs as, how it signs in, and the users each spec file sets up. */
const harness = { install, loginAs, openBilling }
export default harness

// The sign-in waits for the launchpad before going anywhere: a full navigation during the
// profile load logs the user out. Billing is then reached through the rail, as a person does.

// The first-visit tour is marked done before signing in: its overlay covers the rail, and these
// fresh users would otherwise meet it on every run.
