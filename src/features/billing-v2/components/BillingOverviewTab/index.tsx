'use client'
import type { BillingV2Record } from '@/shared/data'
import { useT } from '@/shared/i18n'
import { Panel, StatCard, PieChartCard, BarChartCard } from '@/shared/components/dashboard'
import { CHART_COLORS } from '@/shared/components/dashboard/theme'
import { FiltersPanel } from '@/shared/components/filters'
import { StaggerGrid } from '@/shared/motion'
import useBillingOverview from '@/features/billing-v2/hooks/useBillingOverview'
import s from './index.module.css'

const CATEGORY_COLOR: Record<string, string> = { payroll: CHART_COLORS[1], contractors_vendors: CHART_COLORS[3] }
const STATUS_COLOR: Record<string, string> = {
  pending: CHART_COLORS[9],
  scheduled: CHART_COLORS[1],
  pending_approval: CHART_COLORS[4],
  paid: CHART_COLORS[0],
}
const CURRENCY_FORMAT: Intl.NumberFormatOptions = { style: 'currency', currency: 'USD' }
type Props = { records: BillingV2Record[] }

export default function BillingOverviewTab({ records }: Props) {
  const { t, intlLocale } = useT()
  const { filtros, overview, categoryData, statusData, label, toggle, CATEGORY_KEY, STATUS_KEY } = useBillingOverview(records)
  const subtotal = (overview.subtotalCents / 100).toLocaleString(intlLocale, CURRENCY_FORMAT)

  return (
    <>
      <FiltersPanel filtros={filtros} items={records} persistKey="billing-overview-filters" />
      <Panel title={t('billing.summary.title')} collapsible persistKey="billing-summary">
        <StaggerGrid className={s.stats}>
          <StatCard label={t('billing.summary.knownSubtotal')} value={subtotal} color={CHART_COLORS[0]} />
          <StatCard label={t('billing.summary.unknownCount')} value={overview.unknownCount} color={CHART_COLORS[9]} />
        </StaggerGrid>
      </Panel>
      <StaggerGrid className={s.charts}>
        <PieChartCard title={t('billing.summary.byCategory')} persistKey="billing-summary-category"
          data={categoryData} colors={CATEGORY_COLOR} labelOf={label}
          onSelect={toggle(CATEGORY_KEY)} selected={filtros.valores[CATEGORY_KEY]} />
        <BarChartCard title={t('billing.summary.byStatus')} persistKey="billing-summary-status"
          data={statusData} colors={STATUS_COLOR}
          onSelect={toggle(STATUS_KEY)} selected={filtros.valores[STATUS_KEY]} />
      </StaggerGrid>
    </>
  )
}

// No `period`: the Records calendar's month stopped being this tab's business. `useBillingOverview`
// wires the module's own filter engine (same as Research/Tasks) — its date range covers any span,
// and its category/status selects double as what the two charts let you click to filter.
