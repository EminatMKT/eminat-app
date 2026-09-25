import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { BillingV2Record } from '@/shared/data'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import ReminderPanel from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))

const LATE = 'Late vendor'
const SOON = 'October payroll'
const SETTLED = 'Settled invoice'
const records = [
  fixtureRecord({ id: 'late', title: LATE, scheduled_on: '2026-09-10' }),
  fixtureRecord({ id: 'soon', title: SOON, scheduled_on: '2026-10-01', payment_status: 'scheduled' }),
  fixtureRecord({ id: 'settled', title: SETTLED, scheduled_on: '2026-09-05', payment_status: 'paid' }),
]
const draw = (list: BillingV2Record[]) =>
  renderToStaticMarkup(<ReminderPanel records={list} today="2026-09-23" onOpen={() => undefined} />)

describe('ReminderPanel', () => {
  it('puts overdue payments before the upcoming heading and upcoming ones after it', () => {
    const html = draw(records)
    const split = html.indexOf('billing.reminders.upcoming<')
    expect(html.indexOf(LATE)).toBeLessThan(split)
    expect(html.indexOf(SOON)).toBeGreaterThan(split)
  })

  // Paying something takes it off the reminders; the calendar keeps it.
  it('leaves paid payments out', () => {
    expect(draw(records)).not.toContain(SETTLED)
  })

  it('draws both groups, empty ones included, and says what the lists cover', () => {
    const html = draw([])
    expect(html).toContain('billing.reminders.overdueEmpty')
    expect(html).toContain('billing.reminders.upcomingEmpty')
    expect(html).toContain('billing.reminders.scope')
  })
})
