'use client'
import { useT } from '@/shared/i18n'
import { CHART_COLORS } from '@/shared/components/dashboard/theme'
import { LoadingView, ErrorList } from '@/shared/components/ui'
import type { Props } from './types'
import colors from '../colors'
import stats from './stats'
import StatGrid from './StatGrid'
import type { Stat } from './StatGrid/types'
import s from './index.module.css'

/** Patient-registry KPI row plus the operational KPI row that used to live inline in
 *  `DashboardTab`. Registry values stay a dash until `counts` resolves. */
export default function RegistryKpis(props: Props) {
  const { counts, loading, error, citasHoyCount, citasMananaCount, complianceScore, incidentesTotal, incidentesAbiertosCount } = props
  const { t } = useT()
  const apptFootnote = `${citasMananaCount} ${t('med.statTomorrow')}`
  const incidentFootnote = `${incidentesTotal} ${t('med.statTotal')}`
  const hasOpenIncidents = incidentesAbiertosCount > 0
  const incidentColor = hasOpenIncidents ? colors.COLOR_DANGER : colors.COLOR_ACCENT
  const registryStats = stats.registryStats(counts, t)
  const operationalStats: Stat[] = [
    {
      label: t('med.statApptsToday'),
      value: citasHoyCount,
      color: CHART_COLORS[1],
      footnote: apptFootnote,
    },
    {
      label: t('med.statCompliance'),
      value: `${complianceScore}%`,
      color: stats.complianceColor(complianceScore),
      footnote: t('med.statHipaaCompliance'),
    },
    {
      label: t('med.statOpenIncidents'),
      value: incidentesAbiertosCount,
      color: incidentColor,
      footnote: incidentFootnote,
    },
  ]

  return (
    <>
      {loading && <LoadingView />}
      {error && <ErrorList errores={['med.dashboardLoadError']} />}
      <StatGrid className={s.grid} stats={registryStats} />
      <StatGrid className={s.grid} size="sm" stats={operationalStats} />
    </>
  )
}
// The two StatGrids read as one KPI section: registry truth first, then the three operational
// numbers DashboardTab already surfaced before this rebuild, moved here so the parent stays a
// thin composition root.
