import { describe, expect, it } from 'vitest'
import { canTransitionLead, leadTransitions } from './lead-lifecycle'

describe('native Lead lifecycle', () => {
  it('allows the verified path through qualification, proposal and win', () => {
    expect(canTransitionLead('NEW', 'CONTACTED')).toBe(true)
    expect(canTransitionLead('CONTACTED', 'QUALIFIED')).toBe(true)
    expect(canTransitionLead('QUALIFIED', 'PROPOSAL')).toBe(true)
    expect(canTransitionLead('PROPOSAL', 'PAYMENT_PENDING')).toBe(true)
    expect(canTransitionLead('PAYMENT_PENDING', 'WON')).toBe(true)
  })

  it('rejects skipped, repeated and terminal transitions', () => {
    expect(canTransitionLead('NEW', 'WON')).toBe(false)
    expect(canTransitionLead('CONTACTED', 'CONTACTED')).toBe(false)
    expect(canTransitionLead('WON', 'NEW')).toBe(false)
    expect(canTransitionLead('CONVERTED', 'NEW')).toBe(false)
    expect(canTransitionLead('LOST', 'NEW')).toBe(true)
    expect(canTransitionLead('UNKNOWN', 'NEW')).toBe(false)
    expect(Object.keys(leadTransitions)).toHaveLength(13)
  })
})
