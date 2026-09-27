import { describe, it, expect } from 'vitest'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import monthNotes from './index'

const SEPTEMBER = '2026-09-01'
const note = (id: string, note_month: string) => fixtureRecord({ id, record_type: 'month_note', note_month })
const payment = fixtureRecord({ id: 'p', scheduled_on: SEPTEMBER })

describe('monthNotes', () => {
  // A note can fall on any day; the month it falls in is what groups it.
  it('gathers every note dated inside the month on screen, earliest first', () => {
    const notes = [note('late', '2026-09-28'), note('aug', '2026-08-31'), note('early', '2026-09-03'), note('oct', '2026-10-01')]
    expect(monthNotes([payment, ...notes], SEPTEMBER).map(({ id }) => id)).toEqual(['early', 'late'])
  })

  // Nothing limits a day either: two notes on the same day are both kept.
  it('keeps several notes dated the same day', () => {
    expect(monthNotes([note('a', '2026-09-09'), note('b', '2026-09-09')], SEPTEMBER)).toHaveLength(2)
  })

  // A payment inside the month is still a payment, not one of the month's notes.
  it('answers an empty list when the month carries no note', () => {
    expect(monthNotes([payment], SEPTEMBER)).toEqual([])
  })
})
