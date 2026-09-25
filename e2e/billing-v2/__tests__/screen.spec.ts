import { test, expect } from '@playwright/test'
import screen from '../screen'

const OVERDUE = screen.say('billing.reminders.overdue')
const UPCOMING = screen.say('billing.reminders.upcoming')
const PAYMENT = screen.say('billing.type.payment')

// A static page shaped like the billing screen: a calendar cell, then the two reminder groups.
const MARKUP = `
  <div><button>18</button><button>118</button>
    <div><button>10</button><button aria-label="${PAYMENT} · 10 · Rent">Rent</button></div></div>
  <div><div><h3>${OVERDUE}</h3><button aria-label="10 · Rent">Rent</button></div>
    <div><h3>${UPCOMING}</h3><button aria-label="20 · Fees">Fees</button></div></div>`

test('day pads a date on the frozen month', () => {
  expect(screen.day(3)).toBe('2026-09-03')
})

test('chip finds a calendar record, not its reminder line', async ({ page }) => {
  await page.setContent(MARKUP)
  await expect(screen.chip(page, 'Rent')).toHaveCount(1)
  await expect(screen.cellOf(page, screen.chip(page, 'Rent')).getByRole('button').first()).toHaveText('10')
})

test('group holds only the lines under its own heading', async ({ page }) => {
  await page.setContent(MARKUP)
  await expect(screen.line(screen.group(page, OVERDUE), 'Rent')).toHaveCount(1)
  await expect(screen.line(screen.group(page, OVERDUE), 'Fees')).toHaveCount(0)
  await expect(screen.line(screen.group(page, UPCOMING), 'Fees')).toHaveCount(1)
})

test('field finds the control, not a button whose name starts the same way', async ({ page }) => {
  const note = screen.say('billing.field.noteText')
  await page.setContent(`<button aria-label="${note} x">b</button><label>${note} *<textarea>kept</textarea></label>`)
  await expect(screen.field(page, 'billing.field.noteText')).toHaveValue('kept')
})

test('dayButton matches the whole day number only', async ({ page }) => {
  await page.setContent(MARKUP)
  await expect(screen.dayButton(page, 18)).toHaveCount(1)
})
