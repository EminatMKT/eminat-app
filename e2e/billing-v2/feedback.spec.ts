import { test, expect, type Locator } from '@playwright/test'
import values from '@/features/billing-v2/domain/record-values'
import { BUTTON, DIALOG } from '@/shared/constants/dom'
import session from './session'
import records from './records'
import screen from './screen'
import geometry from './geometry'
import { PAYEE, RUN, SIGNED_AMOUNT, SIGNED_PREVIEW, SIGNED_STORED } from './constants'

// The 26/09 tour: money typed the way people write it, a preview in the reader's money format, a
// landed write confirmed, and a failed one that says what to do next, above the buttons on a desk.
test.describe.configure({ mode: 'serial' })
session.install()

const NEW_RECORD = new RegExp(screen.say('billing.new'))
const [BEFORE, AFTER] = screen.say('billing.amount.set').split('{monto}')
const PREVIEW = new RegExp(`^${BEFORE}${SIGNED_PREVIEW.source}${AFTER}$`)
const SAVED = { hasText: screen.say('billing.saved') }
const DELETED = { hasText: screen.say('billing.deleted') }
const SAVE = { name: screen.say('billing.save'), exact: true }
const DELETE = { name: screen.say('common.delete'), exact: true }

/** Where a button of the dialog sits on screen. */
function buttonEdges(dialog: Locator, name: typeof SAVE) {
  const button = dialog.getByRole(BUTTON, name)
  return geometry.edges(button)
}

test('$150 is accepted, previewed in the reader\'s money format, stored, and confirmed', async ({ page, request }) => {
  const title = `${RUN} signed`
  await session.openBilling(page)
  await page.getByRole(BUTTON, { name: NEW_RECORD }).click()
  await screen.field(page, 'billing.field.title').fill(title)
  await screen.field(page, 'billing.field.scheduledOn').fill(screen.day(24))
  await screen.field(page, 'billing.field.category').selectOption(values.category.enum.payroll)
  await screen.field(page, 'billing.field.payeeLabel').fill(PAYEE)
  await screen.field(page, 'billing.field.amount').fill(SIGNED_AMOUNT)
  await expect(page.getByText(PREVIEW)).toBeVisible()

  await screen.press(page, 'billing.save')
  const status = page.getByRole('status')
  await expect(status.filter(SAVED)).toBeVisible()
  await expect(screen.chip(page, title)).toHaveAccessibleName(SIGNED_STORED)
  await records.adopt(request, title)
})

test('a failed delete says what to do, alone, across the footer above the buttons', async ({ page, request }) => {
  const title = `${RUN} undeletable`
  await records.insert(request, records.payment(title, screen.day(23)))
  await session.openBilling(page)
  await screen.chip(page, title).click()
  await records.breakWrites(page)
  await screen.press(page, 'common.delete')
  await screen.press(page, 'common.delete')

  const editor = page.getByRole(DIALOG)
  const failure = editor.getByText(screen.say('billing.deleteFailed'))
  await expect(failure).toBeFocused()
  await expect(editor.getByText(screen.say('billing.saveBlocked.unchanged'))).toBeHidden()
  const line = await geometry.edges(failure)
  const save = await buttonEdges(editor, SAVE)
  const remove = await buttonEdges(editor, DELETE)
  expect(line.bottom).toBeLessThanOrEqual(Math.min(save.top, remove.top))
  expect(line.right - line.left).toBeGreaterThanOrEqual(save.right - remove.left)

  await page.unrouteAll()
  await screen.press(page, 'common.delete')
  await screen.press(page, 'common.delete')
  const status = page.getByRole('status')
  await expect(status.filter(DELETED)).toBeVisible()
  await expect(screen.chip(page, title)).toBeHidden()
})
