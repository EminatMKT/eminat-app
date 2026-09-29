import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import billingRecordValues from '@/features/billing-v2/domain/record-values'
import useBillingOverview from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (k: string) => k }) }))
vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ usuario: null }) }))

const [PENDING, , , PAID] = billingRecordValues.paymentStatus.options
const paidRecordValues: Parameters<typeof fixtureRecord>[0] = {
  id: '1',
  category: 'payroll',
  payment_status: PAID,
  amount: '10.00',
}
const pendingRecordValues: Parameters<typeof fixtureRecord>[0] = {
  id: '2',
  category: 'contractors_vendors',
  payment_status: PENDING,
  amount: '5.00',
}
const records = [
  fixtureRecord(paidRecordValues),
  fixtureRecord(pendingRecordValues),
]

let captured: ReturnType<typeof useBillingOverview> | undefined
function Probe() {
  captured = useBillingOverview(records)
  return null
}

describe('useBillingOverview', () => {
  // This hook has no async loading state; if it grows one, pair it with an error branch.
  it('totals every payment by amount when nothing is filtered', () => {
    renderToStaticMarkup(<Probe />)
    if (!captured) throw new Error('Billing overview did not render for totals')
    expect(captured.overview.totalCents).toBe(1500)
    expect(captured.overview.paidCents).toBe(1000)
    expect(captured.overview.pendingCents).toBe(500)
  })

  it('tallies the status donut in cents, using stored names for chart labels', () => {
    renderToStaticMarkup(<Probe />)
    if (!captured) throw new Error('Billing overview did not render for status data')
    const paid = captured.statusData.find(d => d.name === PAID)
    expect(paid?.value).toBe(1000)
  })

  it('splits the category breakdown into its own paid and pending tallies, in cents', () => {
    renderToStaticMarkup(<Probe />)
    if (!captured) throw new Error('Billing overview did not render for category data')
    expect(captured.paidCategoryData).toEqual([
      { name: 'payroll', value: 1000 },
      { name: 'contractors_vendors', value: 0 },
    ])
    expect(captured.pendingCategoryData).toEqual([
      { name: 'payroll', value: 0 },
      { name: 'contractors_vendors', value: 500 },
    ])
  })

  it('hands back the category filter key both donuts click through', () => {
    renderToStaticMarkup(<Probe />)
    if (!captured) throw new Error('Billing overview did not render for filters')
    expect(captured.CATEGORY_KEY).toBe('category')
  })
})
