import { describe, it, expect } from 'vitest'
import type { BillingV2Record } from '@/shared/data'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import calendarItems from './index'

const DAY = '2026-09-14'
// The translator hands back the key and the values it was given, so a test sees what reached it.
const t = (key: string, vars?: Record<string, string | number>) => `${key}${JSON.stringify(vars ?? {})}`
const place = (rows: BillingV2Record[]) => calendarItems(rows, t, 'en-US')

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

  // Paid is a different kind of entry, so it is drawn differently; the calendar is told only a tone.
  it('gives a paid payment the tone «done», and nothing else', () => {
    const tones = place([early, late, meeting]).map(({ id, tone }) => [id, tone])
    expect(Object.fromEntries(tones)).toEqual({ early: 'done', late: undefined, meeting: undefined })
  })

  // A month note belongs to the month, not to a day; the billing screen shows it apart.
  it('leaves month notes off the day grid', () => {
    expect(place([note])).toEqual([])
  })

  it('orders the records of one day by time', () => {
    expect(place([late, early]).map(({ id }) => id)).toEqual(['early', 'late'])
  })

  // The chip is one short line: the time and the concept, nothing else competing for the width.
  it('draws the time and the concept on the chip, and only those', () => {
    expect(place([early])[0].label).toBe(`8:00 AM ${early.title}`)
    expect(place([meeting])[0].label).toBe(meeting.title)
  })

  // Hover and the screen reader get the whole record, amount and status included; an unknown
  // amount is said to be unknown, never a zero.
  it('names a payment in full: kind, date, concept, payee, amount and status', () => {
    const said = place([late])[0].accessibleLabel
    expect(said).toContain('billing.calendar.paymentAria')
    for (const part of ['billing.type.payment', 'Sep 14, 2026', late.title ?? '', 'billing.amount.missing', 'billing.status.pending']) {
      expect(said).toContain(part)
    }
  })

  it('names an event by its kind, its date and its concept', () => {
    const said = place([meeting])[0].accessibleLabel
    expect(said).toContain('billing.calendar.eventAria')
    expect(said).toContain('billing.type.event')
    expect(said).not.toContain('billing.amount.missing')
  })
})
