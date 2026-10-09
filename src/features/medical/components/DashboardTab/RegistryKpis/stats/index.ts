import type { I18nKey } from '@/shared/i18n'
import { CHART_COLORS } from '@/shared/components/dashboard/theme'
import { PLACEHOLDER } from '../constants'
import type { Stat } from '../StatGrid/types'
import type { RegistryCounts } from '../types'

type Translate = (key: I18nKey, vars?: Record<string, string | number>) => string

/** The four patient-registry stats, with every value staying a dash until `counts` resolves. */
function registryStats(counts: RegistryCounts | null, t: Translate): Stat[] {
  const fallback = {
    totalPatients: 0,
    withEmail: 0,
    withoutEmail: 0,
    birthdaysThisMonth: 0,
  }
  const { totalPatients, withEmail, withoutEmail, birthdaysThisMonth } = counts ?? fallback
  const total = counts ? totalPatients : PLACEHOLDER
  const reach = counts ? withEmail : PLACEHOLDER
  const birthdays = counts ? birthdaysThisMonth : PLACEHOLDER
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
    { label: t('med.dashboardBirthdaysThisMonth'), value: birthdays, color: CHART_COLORS[3] },
  ]
}

const stats = { registryStats }

export default stats
// `registryStats` keeps the dash-vs-real-value decision for the patient-registry KPI row in one
// place, read once per render by `RegistryKpis`.
