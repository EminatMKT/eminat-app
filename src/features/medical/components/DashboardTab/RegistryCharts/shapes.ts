import type { I18nKey } from '@/shared/i18n'
import { CHART_COLORS } from '@/shared/components/dashboard/theme'
import type { ChartCounts } from './types'

type Translate = (key: I18nKey) => string

/** `{name, value}` pairs for the gender pie, with any zero-count slice dropped. */
function genderChartData(counts: ChartCounts, t: Translate) {
  const { female, male, unknown } = counts.gender
  const data = [
    { name: t('med.dashboardGenderFemale'), value: female },
    { name: t('med.dashboardGenderMale'), value: male },
    { name: t('med.dashboardGenderUnknown'), value: unknown },
  ]
  return data.filter((item) => item.value > 0)
}

/** Name→color lookup for the gender pie, keyed by the same translated labels as its data. */
function genderChartColors(t: Translate): Record<string, string> {
  const colors = {
    [t('med.dashboardGenderFemale')]: CHART_COLORS[0],
    [t('med.dashboardGenderMale')]: CHART_COLORS[1],
    [t('med.dashboardGenderUnknown')]: CHART_COLORS[2],
  }
  return colors
}

/** `{name, value}` pairs for the five age buckets, youngest to oldest. */
function ageBucketChartData(counts: ChartCounts, t: Translate) {
  const { child, youngAdult, adult, olderAdult, senior } = counts.ageBuckets
  return [
    { name: t('med.dashboardAgeChild'), value: child },
    { name: t('med.dashboardAgeYoungAdult'), value: youngAdult },
    { name: t('med.dashboardAgeAdult'), value: adult },
    { name: t('med.dashboardAgeOlderAdult'), value: olderAdult },
    { name: t('med.dashboardAgeSenior'), value: senior },
  ]
}

/** `{name, value}` pairs for the area-code bars, one per known prefix plus the other bucket. */
function areaChartData(counts: ChartCounts) {
  return counts.areaCodes.map((area) => ({ name: `${area.code} ${area.label}`, value: area.count }))
}

/** `{name, value}` pairs for the twelve birthday-month bars, January through December. */
function birthdayMonthChartData(counts: ChartCounts, t: Translate) {
  return counts.birthdaysByMonth.map((entry) => ({ name: t(`med.month${entry.month}` as 'med.month1'), value: entry.count }))
}
/** Pure chart-data shaping for the patient-registry charts — turns raw counts into the
 *  `{name, value}` arrays and color lookups the chart components render. */
const shapes = {
  genderChartData,
  genderChartColors,
  ageBucketChartData,
  areaChartData,
  birthdayMonthChartData,
}

export default shapes
