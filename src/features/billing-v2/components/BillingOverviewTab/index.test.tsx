import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { PieChartCard } from '@/shared/components/dashboard'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import billingRecordValues from '@/features/billing-v2/domain/record-values'
import BillingOverviewTab from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))
vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ usuario: null }) }))
vi.mock('@/shared/components/filters', () => ({ FiltersPanel: () => null }))

const { pieCard } = vi.hoisted(() => ({
  pieCard: vi.fn((_props: Parameters<typeof PieChartCard>[0]) => null),
}))
vi.mock('@/shared/components/dashboard/PieChartCard', () => ({ default: pieCard }))

const { paid: PAID, pending: PENDING } = billingRecordValues.paymentStatus.enum
const paidPayroll = fixtureRecord({
  id: '1',
  category: 'payroll',
  payment_status: PAID,
  amount: '5.00',
})
const pendingContractor = fixtureRecord({
  id: '2',
  category: 'contractors_vendors',
  payment_status: PENDING,
  amount: '3.00',
})

describe('BillingOverviewTab', () => {
  beforeEach(() => pieCard.mockClear())

  it('shows the total, paid, pending and unknown-count KPIs, with no month locking any of it', () => {
    const records = [paidPayroll, pendingContractor, fixtureRecord({ id: '3', amount: null })]
    const html = renderToStaticMarkup(<BillingOverviewTab records={records} />)
    expect(html).toContain('$8.00')
    expect(html).toContain('$5.00')
    expect(html).toContain('$3.00')
    expect(html).toContain('>1<')
  })

  it('feeds the status donut every catalog member in cents, named by the raw value', () => {
    renderToStaticMarkup(<BillingOverviewTab records={[paidPayroll, pendingContractor]} />)
    const statusCall = pieCard.mock.calls[0]?.[0]
    const paid = statusCall?.data.find((d: { name: string }) => d.name === PAID)
    expect(paid).toEqual({ name: PAID, value: 500 })
  })

  it('splits the category breakdown into a paid donut and a pending donut, in cents', () => {
    renderToStaticMarkup(<BillingOverviewTab records={[paidPayroll, pendingContractor]} />)
    const [, paidCategoryCall, pendingCategoryCall] = pieCard.mock.calls
    expect(paidCategoryCall?.[0]?.data).toEqual([
      { name: 'payroll', value: 500 },
      { name: 'contractors_vendors', value: 0 },
    ])
    expect(pendingCategoryCall?.[0]?.data).toEqual([
      { name: 'payroll', value: 0 },
      { name: 'contractors_vendors', value: 300 },
    ])
  })
})
