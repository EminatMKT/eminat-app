import type { Locator, Page } from '@playwright/test'
import es from '@/shared/i18n/locales/es.json'
import type { I18nKey } from '@/shared/i18n'
import { BUTTON, HEADING } from '@/shared/constants/dom'
import { MODULE } from '@/shared/auth/permissions'
import { NAV } from '@/shared/components/shell/appShellConfig/nav'
import LABEL_VARS from '@/features/billing-v2/components/RecordEditor/label-vars'
import { BOX, CONTROLS, PLACEHOLDER, REGEX_SPECIAL } from './constants'

const say = (key: I18nKey, vars: Record<string, string> = {}): string =>
  es[key].replace(PLACEHOLDER, (whole, name: string) => vars[name] ?? whole)
const literally = (text: string) => text.replace(REGEX_SPECIAL, '\\$&')
const day = (n: number) => `2026-09-${String(n).padStart(2, '0')}`
function group(page: Page, name: string) {
  const heading = page.getByRole(HEADING, { name, exact: true })
  return page.locator(BOX, { has: heading }).last()
}
const line = (scope: Locator, text: string) => scope.getByRole(BUTTON, { name: new RegExp(text) })
const chip = (page: Page, text: string) =>
  page.getByRole(BUTTON, { name: new RegExp(`^${say('billing.type.payment')} · .*${text}`) })
const cellOf = (page: Page, item: Locator) => page.locator(BOX, { has: item }).last()
const dayButton = (page: Page, n: number) => page.locator(BUTTON, { hasText: new RegExp(`^${n}$`) })
const defaultHeading = (page: Page) => page.getByRole(HEADING, { level: 2, name: say('billing.tab.records'), exact: true })
const railKey = NAV.find((item) => item.slug === MODULE.COBRANZAS)?.key
const rail = (page: Page) => page.locator(`[data-tour="${railKey}"]`)
const tab = (page: Page, key: I18nKey) => page.getByRole(BUTTON, { name: new RegExp(literally(say(key))) })
function field(page: Page, key: I18nKey) {
  const label = new RegExp(`^${literally(say(key, LABEL_VARS))}`)
  return page.getByLabel(label).and(page.locator(CONTROLS))
}
async function press(page: Page, key: I18nKey) {
  const buttons = page.getByRole(BUTTON, { name: say(key), exact: true })
  await buttons.last().click()
}

/** How the billing e2e names what it looks for on screen, in the app's default locale. */
const screen = { say, day, group, line, chip, cellOf, dayButton, defaultHeading, rail, tab, field, press }
export default screen

// Locators read from the app's own dictionary and catalog; a chip leads with the record type, a
// reminder with its date, and `.last()` is the innermost box. `say` fills variables like the app
// (the amount reads «Monto (USD)») and `field` matches that label literally.
