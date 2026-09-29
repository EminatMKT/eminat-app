import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { PieChartCard, BarChartCard } from '@/shared/components/dashboard'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import billingRecordValues from '@/features/billing-v2/domain/record-values'
import BillingOverviewTab from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))
vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ usuario: null }) }))
vi.mock('@/shared/components/filters', () => ({ FiltersPanel: () => null }))

const { pieCard, barCard } = vi.hoisted(() => ({
  pieCard: vi.fn((_props: Parameters<typeof PieChartCard>[0]) => null),
  barCard: vi.fn((_props: Parameters<typeof BarChartCard>[0]) => null),
}))
vi.mock('@/shared/components/dashboard/PieChartCard', () => ({ default: pieCard }))
vi.mock('@/shared/components/dashboard/BarChartCard', () => ({ default: barCard }))

const { paid: PAID } = billingRecordValues.paymentStatus.enum
const onePaidPayroll = [fixtureRecord({
  id: '1',
  category: 'payroll',
  payment_status: PAID,
  amount: '5.00',
})]

describe('BillingOverviewTab', () => {
  beforeEach(() => {
    pieCard.mockClear()
    barCard.mockClear()
  })

  it('shows the known subtotal and the unknown count, with no month locking it', () => {
    const records = [
      fixtureRecord({ id: '1', amount: '100.00' }),
      fixtureRecord({ id: '2', amount: null }),
    ]
    const html = renderToStaticMarkup(<BillingOverviewTab records={records} />)
    expect(html).toContain('$100.00')
    expect(html).toContain('>1<')
  })

  it('feeds the category pie every catalog member, zeros included, keyed by the raw value', () => {
    renderToStaticMarkup(<BillingOverviewTab records={onePaidPayroll} />)
    const categoryCall = pieCard.mock.calls[0]?.[0]
    expect(categoryCall?.data).toEqual([
      { name: 'payroll', value: 1 },
      { name: 'contractors_vendors', value: 0 },
    ])
  })

  it('feeds the status bar a translated name with the raw value carried as its key', () => {
    renderToStaticMarkup(<BillingOverviewTab records={onePaidPayroll} />)
    const statusCall = barCard.mock.calls[0]?.[0]
    const paid = statusCall?.data.find((d: { key?: string }) => d.key === PAID)
    expect(paid).toEqual({ name: 'billing.status.paid', value: 1, key: PAID })
  })
})
