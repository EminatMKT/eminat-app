'use client'
import { parseISO } from 'date-fns'
import type { BillingV2Record } from '@/shared/data'
import { useT } from '@/shared/i18n'
import { Panel, StatCard, PieChartCard, BarChartCard } from '@/shared/components/dashboard'
import { CHART_COLORS } from '@/shared/components/dashboard/theme'
import { StaggerGrid } from '@/shared/motion'
import billingLabelKey from '@/features/billing-v2/components/RecordEditor/labels'
import monthOverview from '@/features/billing-v2/domain/month-overview'
import s from './index.module.css'

const CATEGORY_COLOR: Record<string, string> = { payroll: CHART_COLORS[1], contractors_vendors: CHART_COLORS[3] }
const STATUS_COLOR: Record<string, string> = {
  pending: CHART_COLORS[9], scheduled: CHART_COLORS[1], pending_approval: CHART_COLORS[4], paid: CHART_COLORS[0],
}
const MONTH_YEAR_FORMAT: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }
const CURRENCY_FORMAT: Intl.NumberFormatOptions = { style: 'currency', currency: 'USD' }

type Props = { records: readonly BillingV2Record[]; today: string }

export default function BillingOverviewTab({ records, today }: Props) {
  const { t, intlLocale } = useT()
  const overview = monthOverview(records, today)
  const period = parseISO(today).toLocaleDateString(intlLocale, MONTH_YEAR_FORMAT)
  const subtotal = (overview.subtotalCents / 100).toLocaleString(intlLocale, CURRENCY_FORMAT)
  const chartData = (tallies: Record<string, number>) =>
    Object.entries(tallies).map(([key, value]) => ({ name: t(billingLabelKey(key)), value }))
  const chartColors = (palette: Record<string, string>) =>
    Object.fromEntries(Object.entries(palette).map(([key, color]) => [t(billingLabelKey(key)), color]))

  return (
    <Panel title={period} collapsible persistKey="billing-summary">
      <StaggerGrid className={s.stats}>
        <StatCard label={t('billing.summary.knownSubtotal')} value={subtotal} color={CHART_COLORS[0]} />
        <StatCard label={t('billing.summary.unknownCount')} value={overview.unknownCount} color={CHART_COLORS[9]} />
      </StaggerGrid>
      <StaggerGrid className={s.charts}>
        <PieChartCard title={t('billing.summary.byCategory')} persistKey="billing-summary-category"
          data={chartData(overview.byCategory)} colors={chartColors(CATEGORY_COLOR)} />
        <BarChartCard title={t('billing.summary.byStatus')} persistKey="billing-summary-status"
          data={chartData(overview.byStatus)} colors={chartColors(STATUS_COLOR)} />
      </StaggerGrid>
    </Panel>
  )
}

// Read-only: never opens the editor. `records` is the same copy `BillingRecordsTab` reads, so
// marking a payment paid there redraws these numbers too, with no second fetch of its own.
