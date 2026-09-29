import { describe, it, expect } from 'vitest'
import { applyFilters } from '@/shared/utils'
import type { I18nKey } from '@/shared/i18n'
import type { BillingV2Record } from '@/shared/data'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import billingFilters from './index'

const t = (k: I18nKey) => String(k)
const deps = { t }
const DEFS = billingFilters(deps)
const byKey = (key: string) => DEFS.find(d => d.key === key)!

const marchPayrollData: Partial<BillingV2Record> = {
  id: '1',
  scheduled_on: '2026-03-05',
  category: 'payroll',
  payment_status: 'paid',
}
const julyVendorData: Partial<BillingV2Record> = {
  id: '2',
  scheduled_on: '2026-07-10',
  category: 'contractors_vendors',
  payment_status: 'pending',
}
const records: BillingV2Record[] = [
  fixtureRecord(marchPayrollData),
  fixtureRecord(julyVendorData),
]

describe('billingFilters', () => {
  it('opens on the date range, the obvious first question of a payment calendar', () => {
    expect(DEFS.find(d => d.principal)?.key).toBe('scheduled_on')
  })

  it('filters scheduled_on by range, any month included', () => {
    const julyRange = { scheduled_on: '2026-07-01..2026-07-31' }
    const inRange = applyFilters(records, DEFS, julyRange)
    expect(inRange.map(r => r.id)).toEqual(['2'])
  })

  it('filters category and payment_status by exact match', () => {
    const payrollFilter = { category: 'payroll' }
    const pendingFilter = { payment_status: 'pending' }
    expect(applyFilters(records, DEFS, payrollFilter).map(r => r.id)).toEqual(['1'])
    expect(applyFilters(records, DEFS, pendingFilter).map(r => r.id)).toEqual(['2'])
  })

  it('offers the closed vocabulary as options, not whatever the data happens to contain', () => {
    expect(byKey('category').options?.([])).toEqual(['payroll', 'contractors_vendors'])
    expect(byKey('payment_status').options?.([])).toEqual(['pending', 'scheduled', 'pending_approval', 'paid'])
  })

  it('labels a raw domain value through i18n, not the stored value itself', () => {
    expect(byKey('category').optionLabel?.('contractors_vendors')).toBe('billing.category.contractorsVendors')
    expect(byKey('payment_status').optionLabel?.('paid')).toBe('billing.status.paid')
  })

  it('combines with everything else in AND, same as any other filter', () => {
    const emptyFilters = {}
    expect(applyFilters(records, DEFS, emptyFilters).length).toBe(2)
  })
})
