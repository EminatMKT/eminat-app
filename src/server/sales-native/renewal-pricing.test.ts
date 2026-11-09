import { describe, expect, it } from 'vitest'
import { addMembershipMonths, plans, membershipTypes, saleDurations, quoteMembership, quoteRenewal } from './pricing'

describe('renewal commercial terms', () => {
  it('charges one existing monthly rate, never the initial two-month advance', () => {
    expect(quoteRenewal('ESSENTIAL','INDIVIDUAL','MONTHLY')).toMatchObject({totalCents:5999,initialMonths:1,monthlyCents:5999})
    expect(quoteRenewal('MAX','FAMILY','MONTHLY')).toMatchObject({totalCents:14999,initialMonths:1})
    expect(quoteMembership('ESSENTIAL','INDIVIDUAL','MONTHLY').totalCents).toBe(11998)
  })
  for (const plan of plans) for (const type of membershipTypes) for (const duration of saleDurations)
    it(`${plan} ${type} ${duration} preserves the existing rate catalog`, () => {
      const initial = quoteMembership(plan,type,duration), renewal = quoteRenewal(plan,type,duration)
      expect(renewal).toEqual({...initial,initialMonths:duration === 'MONTHLY' ? 1 : initial.initialMonths,
        totalCents:duration === 'MONTHLY' ? initial.monthlyCents : initial.totalCents})
    })
  it('extends the existing exclusive end date with end-of-month calendar clamping', () => {
    expect(addMembershipMonths('2028-01-31',1)).toBe('2028-02-29')
    expect(addMembershipMonths('2026-01-31',1)).toBe('2026-02-28')
    expect(addMembershipMonths('2026-12-31',3)).toBe('2027-03-31')
  })
})
