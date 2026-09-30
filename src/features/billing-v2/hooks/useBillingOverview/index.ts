'use client'
import { useT } from '@/shared/i18n'
import { applyFilters } from '@/shared/utils'
import type { BillingV2Record } from '@/shared/data'
import billingLabelKey from '@/features/billing-v2/components/RecordEditor/labels'
import billingOverview from '@/features/billing-v2/domain/billing-overview'
import billingBreakdown from '@/features/billing-v2/domain/billing-breakdown'
import useBillingFilters from '@/features/billing-v2/hooks/useBillingFilters'

const CATEGORY_KEY = 'category'

/** Everything the Overview tab draws: its own filters, its three totals, the status donut (every
 *  filter applies), and the two category donuts (cross-filtered on their own dimension). */
export default function useBillingOverview(records: BillingV2Record[]) {
  const { t } = useT()
  const filtros = useBillingFilters()
  const label = (key: string) => t(billingLabelKey(key))
  const filtered = applyFilters(records, filtros.visibles, filtros.valores)
  const exceptCategory = applyFilters(records, filtros.visibles.filter(d => d.key !== CATEGORY_KEY), filtros.valores)
  const overview = billingOverview(filtered)
  const byStatus = billingBreakdown(filtered).byStatusCents
  const byCategory = billingBreakdown(exceptCategory)
  const statusData = Object.entries(byStatus).map(([key, value]) => ({ name: key, value }))
  const paidCategoryData = Object.entries(byCategory.paidByCategoryCents).map(([key, value]) => ({ name: key, value }))
  const pendingCategoryData = Object.entries(byCategory.pendingByCategoryCents).map(([key, value]) => ({ name: key, value }))
  const toggle = (key: string) => (value: string) => {
    const currentValue = filtros.valores[key]
    const isClearingActiveFilter = currentValue === value
    const nextValue = isClearingActiveFilter ? '' : value
    filtros.setValor(key, nextValue)
  }
  const result = {
    filtros,
    overview,
    statusData,
    paidCategoryData,
    pendingCategoryData,
    label,
    toggle,
    CATEGORY_KEY,
  }
  return result
}

// The status donut respects every filter, including a status filter if one is set — it is not
// clickable, so there is no self-collapse to guard against. The two category donuts ARE
// clickable, so each excludes the category filter from its own tally (see billing-filters).
//
// Chart `value`s stay in cents: `PieChartCard` now takes a `formatValue` — the component passes
// `money()`, so the legend and the tooltip read as real currency, same as the three KPI cards.
