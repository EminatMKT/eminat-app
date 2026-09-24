import type { Locator, Page } from '@playwright/test'
import es from '@/shared/i18n/locales/es.json'
import type { I18nKey } from '@/shared/i18n'
import { BUTTON, HEADING } from '@/shared/constants/dom'

const BOX = 'div'
const CONTROLS = 'input, select, textarea'

const say = (key: I18nKey): string => es[key]
const day = (n: number) => `2026-09-${String(n).padStart(2, '0')}`
const group = (page: Page, name: string) =>
  page.locator(BOX, { has: page.getByRole(HEADING, { name, exact: true }) }).last()
const line = (scope: Locator, text: string) => scope.getByRole(BUTTON, { name: new RegExp(text) })
const chip = (page: Page, title: string) =>
  page.getByRole(BUTTON, { name: new RegExp(`^${say('billing.type.payment')} · .*${title}`) })
const cellOf = (page: Page, item: Locator) => page.locator(BOX, { has: item }).last()
const dayButton = (page: Page, n: number) => page.locator(BUTTON, { hasText: new RegExp(`^${n}$`) })
const field = (page: Page, key: I18nKey) => page.getByLabel(new RegExp(`^${say(key)}`)).and(page.locator(CONTROLS))
const press = (page: Page, key: I18nKey) => page.getByRole(BUTTON, { name: say(key), exact: true }).last().click()

/** How the billing e2e names what it looks for on screen, in the app's default locale. */
const screen = { say, day, group, line, chip, cellOf, dayButton, field, press }
export default screen

// The locators of the billing screen, read from the same dictionary it draws from. A calendar
// chip leads with the record type and a reminder line with its date: that is how the two tell
// apart. The innermost box holding an element is its cell or group, hence `.last()`.
