import { test, expect } from '@playwright/test'
import values from '@/features/billing-v2/domain/record-values'
import session from './session'
import records from './records'
import screen from './screen'
import { RUN } from './constants'

// Task 8, the calendar side: a day starts a new record on its date, every record of a day is
// reachable from the keyboard, and the month note sits above the grid and opens the editor.
test.describe.configure({ mode: 'serial' })
session.install()

const TAB = 'Tab'
const ENTER = 'Enter'

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

test('the month note is drawn above the grid and opens the editor', async ({ page, request }) => {
  const note = `${RUN} month note`
  await records.insert(request, { record_type: values.recordType.enum.month_note, note_month: screen.day(1), note_text: note })
  await session.openBilling(page)
  const noteButton = page.getByRole('button', { name: `${screen.say('billing.type.monthNote')} · ${note}` })
  const drawn = await noteButton.boundingBox()
  const grid = await screen.dayButton(page, 1).first().boundingBox()
  expect(drawn !== null && grid !== null && drawn.y < grid.y, 'the note sits above the month grid').toBe(true)
  await noteButton.click()
  await expect(screen.field(page, 'billing.field.noteText')).toHaveValue(note)
})
