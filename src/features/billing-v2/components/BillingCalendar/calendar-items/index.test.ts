import { describe, it, expect } from 'vitest'
import type { BillingV2Record } from '@/shared/data'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import calendarItems from './index'

const DAY = '2026-09-14'
const place = (rows: BillingV2Record[]) => calendarItems(rows, (key) => key, 'en-US')

const early = fixtureRecord({ id: 'early', scheduled_on: DAY, scheduled_time: '08:00:00', payment_status: 'paid' })
const late = fixtureRecord({ id: 'late', scheduled_on: DAY, scheduled_time: '17:00:00' })
const meeting = fixtureRecord({ id: 'meeting', scheduled_on: DAY, record_type: 'event', payment_status: null })
const note = fixtureRecord({ id: 'note', record_type: 'month_note', scheduled_on: null, note_month: '2026-09-01' })

describe('calendarItems', () => {
  it('places each dated record on its day under its own id', () => {
    expect(place([meeting]).map(({ id, date }) => ({ id, date }))).toEqual([{ id: 'meeting', date: DAY }])
  })

  // A paid payment leaves the reminders, never the calendar.
  it('keeps paid payments on the calendar', () => {
    expect(place([early])).toHaveLength(1)
  })

  // A month note belongs to the month, not to a day; the billing screen shows it apart.
  it('leaves month notes off the day grid', () => {
    expect(place([note])).toEqual([])
  })

  it('orders the records of one day by time', () => {
    expect(place([late, early]).map(({ id }) => id)).toEqual(['early', 'late'])
  })

  it('names each item with its kind, its date and its line', () => {
    const [item] = place([early])
    expect(item.accessibleLabel).toContain('billing.type.payment')
    expect(item.accessibleLabel).toContain('Sep 14, 2026')
    expect(item.line).toContain(early.title)
  })
})
