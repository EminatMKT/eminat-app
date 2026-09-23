import { describe, it, expect } from 'vitest'
import * as billingV1 from './index'

describe('features/billing-v1 public API', () => {
  it('exposes BillingV1Module', () => {
    expect(billingV1.BillingV1Module).toBeDefined()
  })
  it('keeps the stored permission value after the folder rename', () => {
    expect(billingV1.access).toEqual({ module: 'cobranzas' })
  })
})
