import { describe, it, expect } from 'vitest'
import values from '@/features/billing-v2/domain/record-values'
import billingLabelKey from './index'

const ALL = [
  ...values.recordType.options,
  ...values.category.options,
  ...values.paymentStatus.options,
]

describe('billingLabelKey', () => {
  it('gives every stored domain value a key of its own', () => {
    const keys = ALL.map(billingLabelKey)
    expect(keys.filter(Boolean)).toHaveLength(ALL.length)
    expect(new Set(keys).size).toBe(ALL.length)
  })

  // The stored value is the canonical one; only what is shown is translated.
  it('translates the display name without touching the stored value', () => {
    expect(billingLabelKey('month_note')).toBe('billing.type.monthNote')
    expect(billingLabelKey('contractors_vendors')).toBe('billing.category.contractorsVendors')
    expect(billingLabelKey('pending_approval')).toBe('billing.status.pendingApproval')
  })
})
