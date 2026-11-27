import { test, expect, type Page } from '@playwright/test'
import {
  ADMIN_ROLE,
  DEFAULT_ROLE,
  MODULE,
  modulePath,
} from '@/shared/auth/permissions'
import { BUTTON } from '@/shared/constants/dom'
import translate from '@/shared/i18n/translate'
import { PRODUCTION_REPORT_SLOGAN } from '@/features/tasks/utils/report-html/disclaimer'
import { deleteUser, ensureUser } from '@e2e/seed'
import { TASKS_ROLE } from '@e2e/constants'
import harness from '@e2e/billing-v2/session'
import assertDenied from '@e2e/roles/assert-denied'
import writeLocalStorage from '@e2e/task-availability-journey/storage'

const SURNAME = 'PrintAccessE2e'
const WORKER_EMAIL = 'report-print.worker.e2e@eminat.net'
const ADMIN_EMAIL = 'report-print.admin.e2e@eminat.net'
const NO_MODULE_EMAIL = 'report-print.none.e2e@eminat.net'

const USERS: Parameters<typeof ensureUser>[] = [
  [WORKER_EMAIL, TASKS_ROLE, 'Worker', SURNAME],
  [ADMIN_EMAIL, ADMIN_ROLE, 'Admin', SURNAME],
  [NO_MODULE_EMAIL, DEFAULT_ROLE, 'None', SURNAME],
]
const EMAILS = USERS.map(user => user[0])

const LOCALE = 'es'
const LOCALE_ENTRY: readonly [string, string] = ['locale', LOCALE]
const REPORT_TAB_NAME = 'Report'
const REPORT_CONTENT_SELECTOR = '#reporte-content'
const STRATIX_LOGO_ALT = 'Stratix Communications'
const PARENT_SELECTOR = '..'
const LILLY_BRAND_LABEL = 'LILLY'
const POPUP_EVENT = 'popup'
const PRINT_KEY: Parameters<typeof translate>[1] = 'common.print'

const say = (key: Parameters<typeof translate>[1]) => translate(LOCALE, key)
const named = (name: string) => ({ name })
const exactly = (name: string) => ({ name, exact: true })

test.beforeAll(async () => {
  for (const user of USERS) await ensureUser(...user)
})

test.afterAll(async () => {
  for (const email of EMAILS) await deleteUser(email)
})

type OpenReportArgs = { page: Page; email: string }

async function openTasksReportAs({ page, email }: OpenReportArgs) {
  await page.addInitScript(writeLocalStorage, [LOCALE_ENTRY])
  await harness.loginAs(page, email)

  await page.locator(`[data-tour="${MODULE.TASKS}"]`).click()
  await page.waitForURL(`**${modulePath(MODULE.TASKS)}`)
  await page.getByRole(BUTTON, named(REPORT_TAB_NAME)).click()

  await expect(page.locator(REPORT_CONTENT_SELECTOR)).toBeVisible()
}

test('a non-admin with the tasks module sees a print button on their own report', async ({ page }) => {
  await openTasksReportAs({ page, email: WORKER_EMAIL })

  await expect(page.getByRole(BUTTON, exactly(say(PRINT_KEY)))).toBeVisible()
})

test('an admin still sees a print button on the report (no regression)', async ({ page }) => {
  await openTasksReportAs({ page, email: ADMIN_EMAIL })

  await expect(page.getByRole(BUTTON, exactly(say(PRINT_KEY)))).toBeVisible()
})

test('a non-admin without the tasks module is denied /tasks entirely', async ({ page }) => {
  await assertDenied(page, NO_MODULE_EMAIL, modulePath(MODULE.TASKS))
})

test('the non-admin print button opens a Stratix-branded report, not the LILLY header', async ({ page }) => {
  await openTasksReportAs({ page, email: WORKER_EMAIL })
  const printButton = page.getByRole(BUTTON, exactly(say(PRINT_KEY)))

  const [popup] = await Promise.all([
    page.waitForEvent(POPUP_EVENT),
    printButton.click(),
  ])

  const header = popup.getByAltText(STRATIX_LOGO_ALT).locator(PARENT_SELECTOR)

  await expect(header).toContainText(PRODUCTION_REPORT_SLOGAN)
  await expect(header).not.toContainText(LILLY_BRAND_LABEL)
})
