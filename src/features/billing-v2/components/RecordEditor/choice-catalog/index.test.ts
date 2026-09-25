import { describe, it, expect } from 'vitest'
import values from '@/features/billing-v2/domain/record-values'
import choiceCatalog from './index'

const echo = (key: string) => `<${key}>`

describe('choiceCatalog', () => {
  it('offers exactly the domain values, in their order', () => {
    expect(choiceCatalog(values.category.options).valores).toEqual([...values.category.options])
  })

  // What is stored is the canonical value; what is read is its translation.
  it('names each value through its i18n key', () => {
    const { label } = choiceCatalog(values.paymentStatus.options)
    expect(label('pending_approval', echo)).toBe('<billing.status.pendingApproval>')
  })

  it('names nothing when nothing is picked', () => {
    expect(choiceCatalog(values.category.options).label('', echo)).toBe('')
  })
})
