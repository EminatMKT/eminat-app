import { test, expect } from '@playwright/test'
import values from '@/features/billing-v2/domain/record-values'
import { BUTTON } from '@/shared/constants/dom'
import session from './session'
import records from './records'
import screen from './screen'
import { BAD_AMOUNT, PAYEE, RUN, STORED_AMOUNT, TYPED_AMOUNT } from './constants'

// The first delivery's editor fixes: Save is held with its reason in view, a wrong box says so
// under itself once it is left, and an amount typed the es-EC way is stored as it was meant.
test.describe.configure({ mode: 'serial' })
session.install()

const INVALID = ['aria-invalid', 'true'] as const

test('Save is held with its reason, a bad amount is named under its box, and 1.250,40 is stored', async ({ page, request }) => {
  const title = `${RUN} amount`
  await session.openBilling(page)
  await page.getByRole(BUTTON, { name: new RegExp(screen.say('billing.new')) }).click()
  const save = page.getByRole(BUTTON, { name: screen.say('billing.save'), exact: true })
  await expect(save).toBeDisabled()
  const reason = page.getByRole('dialog').getByRole('status')
  await expect(reason).toContainText(screen.say('billing.field.title'))

  await screen.field(page, 'billing.field.title').fill(title)
  await screen.field(page, 'billing.field.scheduledOn').fill(screen.day(26))
  await screen.field(page, 'billing.field.category').selectOption(values.category.enum.payroll)
  await screen.field(page, 'billing.field.payeeLabel').fill(PAYEE)
  const amount = screen.field(page, 'billing.field.amount')
  const complaint = page.getByText(screen.say('billing.error.amount'))
  await amount.fill(BAD_AMOUNT)
  await expect(complaint).toBeHidden()
  await amount.blur()
  await expect(complaint).toBeVisible()
  await expect(amount).toHaveAttribute(...INVALID)

  await amount.fill(TYPED_AMOUNT)
  await expect(complaint).toBeHidden()
  await expect(save).toBeEnabled()
  await save.click()
  await expect(screen.chip(page, title)).toHaveAccessibleName(STORED_AMOUNT)
  await records.adopt(request, title)
})
