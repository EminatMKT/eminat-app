import type { I18nKey } from '@/shared/i18n'
import { CHART_COLORS } from '@/shared/components/dashboard/theme'
import colors from '@/features/medical/components/DashboardTab/colors'
import { PLACEHOLDER } from '../constants'
import type { Stat } from '../StatGrid/types'
import type { RegistryCounts } from '../types'

type Translate = (key: I18nKey, vars?: Record<string, string | number>) => string

/** The four patient-registry stats, with every value staying a dash until `counts` resolves. */
function registryStats(counts: RegistryCounts | null, t: Translate): Stat[] {
  const fallback = { totalPatients: 0, withEmail: 0, withoutEmail: 0 }
  const { totalPatients, withEmail, withoutEmail } = counts ?? fallback
  const total = counts ? totalPatients : PLACEHOLDER
  const reach = counts ? withEmail : PLACEHOLDER
  const missingVars = { count: counts ? withoutEmail : 0 }
  const missingFootnote = counts ? t('med.dashboardMissingEmailFootnote', missingVars) : undefined
  const unavailable = t('med.dashboardUnavailable')
  return [
    { label: t('med.dashboardTotalPatients'), value: total, color: CHART_COLORS[0] },
    {
      label: t('med.dashboardEmailReach'),
      value: reach,
      color: CHART_COLORS[1],
      footnote: missingFootnote,
    },
    {
      label: t('med.dashboardMedianAge'),
      value: PLACEHOLDER,
      color: CHART_COLORS[2],
      footnote: unavailable,
    },
    {
      label: t('med.dashboardBirthdaysThisMonth'),
      value: PLACEHOLDER,
      color: CHART_COLORS[3],
      footnote: unavailable,
    },
  ]
}

function complianceColor(score: number): string {
  if (score >= 80) return colors.COLOR_ACCENT
  if (score >= 60) return colors.COLOR_WARN
  return colors.COLOR_DANGER
}

const stats = { registryStats, complianceColor }

export default stats
// A named decision per tier instead of a nested ternary: `complianceColor` lets the reader see
// one rule at a time, same as `registryStats` keeps the dash-vs-real-value decision in one place.
