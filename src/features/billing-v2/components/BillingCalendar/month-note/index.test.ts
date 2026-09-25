import { describe, it, expect } from 'vitest'
import type { BillingV2Record } from '@/shared/data'
import monthNote from './index'

const SEPTEMBER = '2026-09-01'
const note = (id: string, note_month: string) => ({ id, record_type: 'month_note', note_month }) as BillingV2Record
const payment = { id: 'p', record_type: 'payment', scheduled_on: SEPTEMBER, note_month: null } as BillingV2Record

describe('monthNote', () => {
  it('finds the note of the month on screen', () => {
    expect(monthNote([payment, note('aug', '2026-08-01'), note('sep', SEPTEMBER)], SEPTEMBER)?.id).toBe('sep')
  })

  // A payment on the first of the month is still a payment, not the month's note.
  it('answers null when the month carries no note', () => {
    expect(monthNote([payment], SEPTEMBER)).toBeNull()
  })
})
