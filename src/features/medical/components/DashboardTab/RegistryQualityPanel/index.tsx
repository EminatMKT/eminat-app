'use client'
import { useT } from '@/shared/i18n'
import { Panel, StatBreakdownRow } from '@/shared/components/dashboard'
import type { DataQualityCounts } from '@/features/medical/data/patientDashboardCounts/types'

const PLACEHOLDER = '—'

type Props = {
  dataQuality: DataQualityCounts
}

function orPlaceholder(value: number | null): number | string {
  return value === null ? PLACEHOLDER : value
}

/** Lists the five registry data-quality signals. Four of them stay `null` until a database
 *  aggregate exists — each renders an explicit "not available yet" value, never a fake zero. */
export default function RegistryQualityPanel(props: Props) {
  const { dataQuality } = props
  const { missingEmail, sharedPhone, sharedEmail, repeatedName, typoEmailDomain } = dataQuality
  const { t } = useT()

  return (
    <Panel collapsible persistKey="medical-dashboard-quality" title={t('med.dashboardQualityTitle')}>
      <StatBreakdownRow label={t('med.dashboardQualityMissingEmail')} value={missingEmail} />
      <StatBreakdownRow label={t('med.dashboardQualitySharedPhone')} value={orPlaceholder(sharedPhone)} />
      <StatBreakdownRow label={t('med.dashboardQualitySharedEmail')} value={orPlaceholder(sharedEmail)} />
      <StatBreakdownRow label={t('med.dashboardQualityRepeatedName')} value={orPlaceholder(repeatedName)} />
      <StatBreakdownRow label={t('med.dashboardQualityTypoDomain')} value={orPlaceholder(typoEmailDomain)} />
    </Panel>
  )
}

// Reuses StatBreakdownRow (the same label/value row StatCard uses for its own detail section)
// instead of hand-rolling a new row: a label-left, value-right pair is already solved there.
