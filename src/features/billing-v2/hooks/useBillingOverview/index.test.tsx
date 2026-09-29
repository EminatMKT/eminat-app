import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import billingRecordValues from '@/features/billing-v2/domain/record-values'
import useBillingOverview from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (k: string) => k }) }))
vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ usuario: null }) }))

const { paid: PAID, pending: PENDING } = billingRecordValues.paymentStatus.enum
const records = [
  fixtureRecord({
    id: '1',
    category: 'payroll',
    payment_status: PAID,
    amount: '10.00',
  }),
  fixtureRecord({
    id: '2',
    category: 'contractors_vendors',
    payment_status: PENDING,
    amount: '5.00',
  }),
]

let captured: ReturnType<typeof useBillingOverview> | undefined
function Probe() {
  captured = useBillingOverview(records)
  return null
}

describe('useBillingOverview', () => {
  it('totals every payment by amount when nothing is filtered', () => {
    renderToStaticMarkup(<Probe />)
    expect(captured?.overview.totalCents).toBe(1500)
    expect(captured?.overview.paidCents).toBe(1000)
    expect(captured?.overview.pendingCents).toBe(500)
  })

  it('tallies the status donut in whole dollars, named by the raw value for PieChartCard to translate', () => {
    renderToStaticMarkup(<Probe />)
    const paid = captured?.statusData.find(d => d.name === PAID)
    expect(paid?.value).toBe(10)
  })

  it('splits the category breakdown into its own paid and pending tallies, in whole dollars', () => {
    renderToStaticMarkup(<Probe />)
    expect(captured?.paidCategoryData).toEqual([
      { name: 'payroll', value: 10 },
      { name: 'contractors_vendors', value: 0 },
    ])
    expect(captured?.pendingCategoryData).toEqual([
      { name: 'payroll', value: 0 },
      { name: 'contractors_vendors', value: 5 },
    ])
  })

  it('hands back the category filter key both donuts click through', () => {
    renderToStaticMarkup(<Probe />)
    expect(captured?.CATEGORY_KEY).toBe('category')
  })
})
