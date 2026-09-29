import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import billingRecordValues from '@/features/billing-v2/domain/record-values'
import BillingOverviewTab from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))
vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ usuario: null }) }))
vi.mock('@/shared/components/filters', () => ({ FiltersPanel: () => null }))

const EMPTY_CHART_VALUES = 'No chart values'

function chartText(props) {
  if (!props.data.length) return EMPTY_CHART_VALUES
  return props.data.map(row => `${row.name}:${row.value}`).join('|')
}

vi.mock('@/shared/components/dashboard', () => ({
  Panel: (props) => createElement('section', null, props.children),
  StatCard: (props) => createElement('div', null, props.label, createElement('span', null, props.value)),
  PieChartCard: (props) => createElement('pre', null, chartText(props)),
}))

const [PENDING, , , PAID] = billingRecordValues.paymentStatus.options
const paidPayrollValues: Parameters<typeof fixtureRecord>[0] = {
  id: '1',
  category: 'payroll',
  payment_status: PAID,
  amount: '5.00',
}
const paidPayroll = fixtureRecord(paidPayrollValues)
const pendingContractorValues: Parameters<typeof fixtureRecord>[0] = {
  id: '2',
  category: 'contractors_vendors',
  payment_status: PENDING,
  amount: '3.00',
}
const pendingContractor = fixtureRecord(pendingContractorValues)
const unknownAmountValues = { id: '3', amount: null }

describe('BillingOverviewTab', () => {
  // There is no async loading state in this render path; a future loader should include error copy.
  it('shows the total, paid, pending and unknown-count summaries without month locking', () => {
    const records = [paidPayroll, pendingContractor, fixtureRecord(unknownAmountValues)]
    const html = renderToStaticMarkup(<BillingOverviewTab records={records} />)
    expect(html).toContain('$8.00')
    expect(html).toContain('$5.00')
    expect(html).toContain('$3.00')
    expect(html).toContain('>1<')
  })

  it('feeds the status chart every payment state in cents, using stored names for labels', () => {
    const html = renderToStaticMarkup(<BillingOverviewTab records={[paidPayroll, pendingContractor]} />)
    expect(html).toContain(`${PAID}:500`)
  })

  it('splits the category breakdown into paid and pending charts, in cents', () => {
    const html = renderToStaticMarkup(<BillingOverviewTab records={[paidPayroll, pendingContractor]} />)
    expect(html).toContain('payroll:500')
    expect(html).toContain('contractors_vendors:300')
  })
})
