import { test, expect } from '@playwright/test'
import values from '@/features/billing-v2/domain/record-values'
import session from './session'
import records from './records'
import screen from './screen'
import { PAYEE, RUN } from './constants'

// Task 7: a record typed by hand survives a failed save, a manual status change and a reload,
// and a delete that is cancelled leaves it where it was.
test.describe.configure({ mode: 'serial' })
session.install()

const AMOUNT = '250'

test('create, survive a failed save, change the status, reload, and cancel a delete', async ({ page, request }) => {
  const title = `${RUN} lifecycle`
  await session.openBilling(page)
  await page.getByRole('button', { name: new RegExp(screen.say('billing.new')) }).click()
  await screen.field(page, 'billing.field.scheduledOn').fill(screen.day(25))
  await screen.field(page, 'billing.field.title').fill(title)
  await screen.field(page, 'billing.field.category').selectOption(values.category.enum.payroll)
  await screen.field(page, 'billing.field.payeeLabel').fill(PAYEE)
  await screen.field(page, 'billing.field.amount').fill(AMOUNT)

  await records.breakWrites(page)
  await screen.press(page, 'billing.save')
  await expect(page.getByText(screen.say('billing.saveFailed'))).toBeVisible()
  await expect(screen.field(page, 'billing.field.title')).toHaveValue(title)
  await expect(screen.field(page, 'billing.field.amount')).toHaveValue(AMOUNT)
  await page.unrouteAll()

  await screen.press(page, 'billing.save')
  await expect(screen.chip(page, title)).toBeVisible()
  await records.adopt(request, title)

  await screen.chip(page, title).click()
  await screen.field(page, 'billing.field.paymentStatus').selectOption(values.paymentStatus.enum.scheduled)
  await screen.press(page, 'billing.save')
  await expect(screen.chip(page, title)).toContainText(screen.say('billing.status.scheduled'))
  await page.reload()
  await expect(screen.chip(page, title)).toContainText(screen.say('billing.status.scheduled'))

  await screen.chip(page, title).click()
  await screen.press(page, 'common.delete')
  await expect(page.getByText(screen.say('billing.deleteMsg'))).toBeVisible()
  // The question opens inside the editor, so its Cancel is found inside the innermost box
  // holding both the question and a Cancel: the editor's own Cancel sits behind it.
  const cancel = page.getByRole('button', { name: screen.say('common.cancel'), exact: true })
  const question = page.locator('div', { has: page.getByText(screen.say('billing.deleteMsg')) }).filter({ has: cancel }).last()
  await question.getByRole('button', { name: screen.say('common.cancel'), exact: true }).click()
  await expect(page.getByText(screen.say('billing.deleteMsg'))).toBeHidden()
  await screen.press(page, 'common.cancel')
  await page.reload()
  await expect(screen.chip(page, title)).toBeVisible()
})
