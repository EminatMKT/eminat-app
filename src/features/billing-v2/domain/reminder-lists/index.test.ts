import { describe, it, expect } from 'vitest'
import type { BillingV2Record } from '@/shared/data'
import reminderLists from './index'

const TODAY = '2026-09-23'
const row = (id: string, fields: Partial<BillingV2Record>) =>
  ({ id, record_type: 'payment', payment_status: 'pending', scheduled_on: TODAY, ...fields }) as BillingV2Record

const late = row('late', { scheduled_on: '2026-09-22' })
const older = row('older', { scheduled_on: '2026-08-31' })
const due = row('due', {})
const ahead = row('ahead', { scheduled_on: '2027-03-01' })
const settled = row('settled', { scheduled_on: '2026-09-01', payment_status: 'paid' })
const meeting = row('meeting', { record_type: 'event', payment_status: null })
const note = row('note', { record_type: 'month_note', payment_status: null, scheduled_on: null })
const ids = (list: readonly BillingV2Record[]) => list.map((one) => one.id)

describe('reminderLists', () => {
  it('splits unpaid payments at today, today itself counting as upcoming', () => {
    const lists = reminderLists([due, late, ahead], TODAY)
    expect(ids(lists.overdue)).toEqual(['late'])
    expect(ids(lists.upcoming)).toEqual(['due', 'ahead'])
  })

  // Upcoming has no horizon: a payment months away is still a reminder.
  it('keeps far-future unpaid payments in upcoming', () => {
    expect(ids(reminderLists([ahead], TODAY).upcoming)).toEqual(['ahead'])
  })

  it('leaves paid payments, events and month notes out of both lists', () => {
    const lists = reminderLists([settled, meeting, note], TODAY)
    expect(lists.overdue).toEqual([])
    expect(lists.upcoming).toEqual([])
  })

  it('orders each list by due date, oldest first', () => {
    expect(ids(reminderLists([late, older], TODAY).overdue)).toEqual(['older', 'late'])
  })

  // Moving the due date is what moves a payment between the groups.
  it('follows a due date that changed', () => {
    const moved = { ...late, scheduled_on: '2026-10-05' }
    expect(ids(reminderLists([moved], TODAY).upcoming)).toEqual(['late'])
  })
})
