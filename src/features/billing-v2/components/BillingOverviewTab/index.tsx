'use client'
import type { BillingV2Record } from '@/shared/data'
import { useT } from '@/shared/i18n'
import { Panel, StatCard, PieChartCard } from '@/shared/components/dashboard'
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
  const {
    filtros, overview, statusData, paidCategoryData, pendingCategoryData, label, toggle, CATEGORY_KEY,
  } = useBillingOverview(records)
  const money = (cents: number) => (cents / 100).toLocaleString(intlLocale, CURRENCY_FORMAT)
  return (
    <>
      <FiltersPanel filtros={filtros} items={records} persistKey="billing-overview-filters" />
      <Panel title={t('billing.summary.title')} collapsible persistKey="billing-summary">
        <StaggerGrid className={s.stats}>
          <StatCard label={t('billing.summary.knownSubtotal')} value={money(overview.totalCents)} color={CHART_COLORS[0]} />
          <StatCard label={t('billing.summary.paid')} value={money(overview.paidCents)} color={STATUS_COLOR.paid} />
          <StatCard label={t('billing.summary.pending')} value={money(overview.pendingCents)} color={STATUS_COLOR.pending} />
          <StatCard label={t('billing.summary.unknownCount')} value={overview.unknownCount} color={CHART_COLORS[9]} />
        </StaggerGrid>
      </Panel>
      <StaggerGrid className={s.charts}>
        <PieChartCard title={t('billing.summary.byStatus')} persistKey="billing-summary-status"
          data={statusData} colors={STATUS_COLOR} labelOf={label} />
        <PieChartCard title={t('billing.summary.paidByCategory')} persistKey="billing-summary-paid-category"
          data={paidCategoryData} colors={CATEGORY_COLOR} labelOf={label}
          onSelect={toggle(CATEGORY_KEY)} selected={filtros.valores[CATEGORY_KEY]} />
        <PieChartCard title={t('billing.summary.pendingByCategory')} persistKey="billing-summary-pending-category"
          data={pendingCategoryData} colors={CATEGORY_COLOR} labelOf={label}
          onSelect={toggle(CATEGORY_KEY)} selected={filtros.valores[CATEGORY_KEY]} />
      </StaggerGrid>
    </>
  )
}
// No `period`: Total/Paid/Pending and the status donut read every filter; each category donut
// cross-filters its own dimension so clicking "Payroll" doesn't erase "Contractors" from view.
