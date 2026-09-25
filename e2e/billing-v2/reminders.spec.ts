import { test, expect } from '@playwright/test'
import values from '@/features/billing-v2/domain/record-values'
import session from './session'
import records from './records'
import screen from './screen'
import { RUN, ZERO_MONEY } from './constants'

// Task 8, the reminder side: Overdue and Upcoming follow the status and the due date, and an
// unknown amount never turns into a confirmed zero on the chip or on the reminder line.
test.describe.configure({ mode: 'serial' })
session.install()

const OVERDUE = screen.say('billing.reminders.overdue')
const UPCOMING = screen.say('billing.reminders.upcoming')
const { paid } = values.paymentStatus.enum

test('with no unpaid payments both groups still show, each saying it is empty', async ({ page, request }) => {
  expect(await records.foreignUnpaid(request), 'precondition: no other unpaid payment in the local table').toEqual([])
  await records.insert(request, records.payment(`${RUN} settled`, screen.day(3), { payment_status: paid }))
  await session.openBilling(page)
  await expect(screen.group(page, OVERDUE)).toContainText(screen.say('billing.reminders.overdueEmpty'))
  await expect(screen.group(page, UPCOMING)).toContainText(screen.say('billing.reminders.upcomingEmpty'))
})

test('paying an overdue payment takes it off Overdue and leaves it on its day', async ({ page, request }) => {
  const title = `${RUN} overdue`
  await records.insert(request, records.payment(title, screen.day(10)))
  await session.openBilling(page)
  await screen.line(screen.group(page, OVERDUE), title).click()
  await screen.field(page, 'billing.field.paymentStatus').selectOption(paid)
  await screen.press(page, 'billing.save')
  await expect(screen.line(screen.group(page, OVERDUE), title)).toHaveCount(0)
  await expect(screen.chip(page, title)).toContainText(screen.say('billing.status.paid'))
  await expect(screen.cellOf(page, screen.chip(page, title)).getByRole('button').first()).toHaveText('10')
})

test('moving the due date moves the payment between groups and between days', async ({ page, request }) => {
  const title = `${RUN} moving`
  await records.insert(request, records.payment(title, screen.day(20)))
  await session.openBilling(page)
  await expect(screen.line(screen.group(page, UPCOMING), title)).toHaveCount(1)
  await expect(screen.cellOf(page, screen.chip(page, title)).getByRole('button').first()).toHaveText('20')
  await screen.chip(page, title).click()
  await screen.field(page, 'billing.field.scheduledOn').fill(screen.day(12))
  await screen.press(page, 'billing.save')
  await expect(screen.line(screen.group(page, OVERDUE), title)).toHaveCount(1)
  await expect(screen.line(screen.group(page, UPCOMING), title)).toHaveCount(0)
  await expect(screen.cellOf(page, screen.chip(page, title)).getByRole('button').first()).toHaveText('12')
})

test('an empty amount reads unknown on chip and reminder, and only 0 reads as zero', async ({ page, request }) => {
  const unknown = `${RUN} unknown`
  const zero = `${RUN} zero`
  await records.insert(request, records.payment(unknown, screen.day(21), { amount: null }))
  await records.insert(request, records.payment(zero, screen.day(23), { amount: 0 }))
  await session.openBilling(page)
  const reminder = screen.line(screen.group(page, UPCOMING), unknown)
  for (const drawn of [screen.chip(page, unknown), reminder]) {
    await expect(drawn).toContainText(screen.say('billing.amount.missing'))
    await expect(drawn).not.toContainText(ZERO_MONEY)
  }
  await expect(screen.chip(page, zero)).toContainText(ZERO_MONEY)
})
