'use client'
import { useT } from '@/shared/i18n'
import { applyFilters } from '@/shared/utils'
import type { BillingV2Record } from '@/shared/data'
import billingLabelKey from '@/features/billing-v2/components/RecordEditor/labels'
import billingOverview from '@/features/billing-v2/domain/billing-overview'
import useBillingFilters from '@/features/billing-v2/hooks/useBillingFilters'

const CATEGORY_KEY = 'category'
const STATUS_KEY = 'payment_status'

/** Everything the Overview tab draws: its own filters, its totals, and each chart's own tally. */
export default function useBillingOverview(records: BillingV2Record[]) {
  const { t } = useT()
  const filtros = useBillingFilters()
  const label = (key: string) => t(billingLabelKey(key))
  const exceptOwn = (key: string) =>
    applyFilters(records, filtros.visibles.filter(d => d.key !== key), filtros.valores)
  const overview = billingOverview(applyFilters(records, filtros.visibles, filtros.valores))
  const categoryOverview = billingOverview(exceptOwn(CATEGORY_KEY))
  const statusOverview = billingOverview(exceptOwn(STATUS_KEY))
  const categoryData = Object.entries(categoryOverview.byCategory).map(([key, value]) => ({ name: key, value }))
  const statusData = Object.entries(statusOverview.byStatus).map(([key, value]) => ({ name: label(key), value, key }))
  const toggle = (key: string) => (v: string) => filtros.setValor(key, filtros.valores[key] === v ? '' : v)
  const result = {
    filtros,
    overview,
    categoryData,
    statusData,
    label,
    toggle,
    CATEGORY_KEY,
    STATUS_KEY,
  }
  return result
}

// Cross-filter: a chart tallies with every filter EXCEPT its own, so clicking "payroll" doesn't
// hide "contractors_vendors" on the next click; the totals use every filter, same as Tasks.
