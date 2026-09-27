import { test, expect, type Locator } from '@playwright/test'
import values from '@/features/billing-v2/domain/record-values'
import { ENTER, TAB } from '@/shared/constants/dom'
import session from './session'
import records from './records'
import screen from './screen'
import { CHECK_MARK, RUN, TODAY_DAY } from './constants'

// Task 8, the calendar side: a day starts a new record on its date, every record of a day is
// reachable from the keyboard, and the month's notes sit above the grid and open the editor.
test.describe.configure({ mode: 'serial' })
session.install()


test('pressing a day opens a new record on that date', async ({ page }) => {
  await session.openBilling(page)
  await screen.dayButton(page, 18).click()
  await expect(screen.field(page, 'billing.field.scheduledOn')).toHaveValue(screen.day(18))
})

test('two records on one day are each reached by Tab and opened with Enter', async ({ page, request }) => {
  const first = `${RUN} first`
  const second = `${RUN} second`
  await records.insert(request, records.payment(first, screen.day(22), { scheduled_time: '09:00' }))
  await records.insert(request, records.payment(second, screen.day(22), { scheduled_time: '10:00' }))
  await session.openBilling(page)
  for (const [presses, title] of [[1, first], [2, second]] as const) {
    await screen.dayButton(page, 22).focus()
    for (let i = 0; i < presses; i++) await page.keyboard.press(TAB)
    await expect(screen.chip(page, title)).toBeFocused()
    await page.keyboard.press(ENTER)
    await expect(screen.field(page, 'billing.field.title')).toHaveValue(title)
    await screen.press(page, 'common.cancel')
  }
})

/** A chip's fill and what its stylesheet draws before the text (the paid check mark). */
function look(chip: Locator) {
  return chip.evaluate((node) => [getComputedStyle(node).backgroundColor, getComputedStyle(node, '::before').content])
}

test('today is marked, and a paid payment is drawn apart from an unpaid one', async ({ page, request }) => {
  const paid = `${RUN} paid`
  const owed = `${RUN} owed`
  await records.insert(request, records.payment(paid, screen.day(22), { payment_status: values.paymentStatus.enum.paid }))
  await records.insert(request, records.payment(owed, screen.day(22)))
  await session.openBilling(page)
  await expect(screen.dayButton(page, TODAY_DAY)).toHaveAttribute('aria-current', 'date')
  const [paidFill, paidMark] = await look(screen.chip(page, paid))
  const [owedFill, owedMark] = await look(screen.chip(page, owed))
  expect(paidFill).not.toBe(owedFill)
  expect([paidMark.includes(CHECK_MARK), owedMark.includes(CHECK_MARK)]).toEqual([true, false])
})

// A month holds any number of notes, each on any day: two in one month both reach the screen.
test('the month notes are drawn above the grid and open the editor', async ({ page, request }) => {
  const note = `${RUN} month note`
  const later = `${RUN} later note`
  const kind = values.recordType.enum.month_note
  await records.insert(request, { record_type: kind, note_month: screen.day(3), note_text: note })
  await records.insert(request, { record_type: kind, note_month: screen.day(17), note_text: later })
  await session.openBilling(page)
  const noteButton = page.getByRole('button', { name: `${screen.say('billing.type.monthNote')} · ${note}` })
  await expect(page.getByRole('button', { name: `${screen.say('billing.type.monthNote')} · ${later}` })).toBeVisible()
  const drawn = await noteButton.boundingBox()
  const grid = await screen.dayButton(page, 1).first().boundingBox()
  expect(drawn !== null && grid !== null && drawn.y < grid.y, 'the note sits above the month grid').toBe(true)
  await noteButton.click()
  await expect(screen.field(page, 'billing.field.noteText')).toHaveValue(note)
})
