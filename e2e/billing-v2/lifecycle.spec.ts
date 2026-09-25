import { test, expect } from '@playwright/test'
import values from '@/features/billing-v2/domain/record-values'
import { BUTTON } from '@/shared/constants/dom'
import session from './session'
import records from './records'
import screen from './screen'
import { BOX, PAYEE, RUN } from './constants'

// Task 7: a record typed by hand survives a failed save, a manual status change and a reload,
// and a delete that is cancelled leaves it where it was.
test.describe.configure({ mode: 'serial' })
session.install()

const AMOUNT = '250'
const SCHEDULED = new RegExp(screen.say('billing.status.scheduled'))

test('create, survive a failed save, change the status, reload, and cancel a delete', async ({ page, request }) => {
  const title = `${RUN} lifecycle`
  await session.openBilling(page)
  await page.getByRole(BUTTON, { name: new RegExp(screen.say('billing.new')) }).click()
  await screen.field(page, 'billing.field.scheduledOn').fill(screen.day(25))
  await screen.field(page, 'billing.field.title').fill(title)
  await screen.field(page, 'billing.field.category').selectOption(values.category.enum.payroll)
  await screen.field(page, 'billing.field.payeeLabel').fill(PAYEE)
  await screen.field(page, 'billing.field.amount').fill(AMOUNT)

  await records.breakWrites(page)
  await screen.press(page, 'billing.save')
  // The failure belongs to no field: it is said beside the actions and takes the focus.
  await expect(page.getByText(screen.say('billing.saveFailed'))).toBeFocused()
  await expect(screen.field(page, 'billing.field.title')).toHaveValue(title)
  await expect(screen.field(page, 'billing.field.amount')).toHaveValue(AMOUNT)
  await page.unrouteAll()

  await screen.press(page, 'billing.save')
  await expect(screen.chip(page, title)).toBeVisible()
  await records.adopt(request, title)

  await screen.chip(page, title).click()
  await screen.field(page, 'billing.field.paymentStatus').selectOption(values.paymentStatus.enum.scheduled)
  await screen.press(page, 'billing.save')
  // A chip draws only the time and the concept; the status is in its accessible name.
  await expect(screen.chip(page, title)).toHaveAccessibleName(SCHEDULED)
  await page.reload()
  await expect(screen.chip(page, title)).toHaveAccessibleName(SCHEDULED)

  await screen.chip(page, title).click()
  await screen.press(page, 'common.delete')
  const question = page.getByText(screen.say('billing.deleteMsg'))
  await expect(question).toBeVisible()
  // The question opens inside the editor, so its Cancel is found inside the innermost box
  // holding both the question and a Cancel: the editor's own Cancel sits behind it.
  const cancel = page.getByRole(BUTTON, { name: screen.say('common.cancel'), exact: true })
  const boxes = page.locator(BOX, { has: question }).filter({ has: cancel })
  const inQuestion = boxes.last().getByRole(BUTTON, { name: screen.say('common.cancel'), exact: true })
  await inQuestion.click()
  await expect(question).toBeHidden()
  await screen.press(page, 'common.cancel')
  await page.reload()
  await expect(screen.chip(page, title)).toBeVisible()
})
