import { describe, it, expect } from 'vitest'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import monthNote from './index'

const SEPTEMBER = '2026-09-01'
const note = (id: string, note_month: string) => fixtureRecord({ id, record_type: 'month_note', note_month })
const payment = fixtureRecord({ id: 'p', scheduled_on: SEPTEMBER })

describe('monthNote', () => {
  it('finds the note of the month on screen', () => {
    expect(monthNote([payment, note('aug', '2026-08-01'), note('sep', SEPTEMBER)], SEPTEMBER)?.id).toBe('sep')
  })

  // A payment on the first of the month is still a payment, not the month's note.
  it('answers null when the month carries no note', () => {
    expect(monthNote([payment], SEPTEMBER)).toBeNull()
  })
})
