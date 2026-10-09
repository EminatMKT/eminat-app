'use client'
import { useT } from '@/shared/i18n'
import {
  Panel,
  PieChartCard,
  BarChartCard,
  ChartRow,
} from '@/shared/components/dashboard'
import shapes from './shapes'
import type { Props } from './types'

/** Renders the reference charts for the patient registry: birthdays by month, gender split,
 *  age distribution, and area-code concentration. */
export default function RegistryCharts(props: Props) {
  const { counts } = props
  const { t } = useT()
  const birthdayData = shapes.birthdayMonthChartData(counts, t)
  const genderData = shapes.genderChartData(counts, t)
  const genderColors = shapes.genderChartColors(t)
  const ageBucketData = shapes.ageBucketChartData(counts, t)
  const areaData = shapes.areaChartData(counts)
  // length === 0, not > 0: the no-data branch has to be the one the condition names directly.
  const noAreaCodes = counts.areaCodes.length === 0

  return (
    <>
      <ChartRow>
        <BarChartCard persistKey="medical-dashboard-birthdays" title={t('med.dashboardBirthdaysByMonth')} data={birthdayData} />
        <PieChartCard persistKey="medical-dashboard-gender" title={t('med.dashboardGenderSplit')} data={genderData} colors={genderColors} />
      </ChartRow>
      <ChartRow>
        <BarChartCard persistKey="medical-dashboard-age-buckets" title={t('med.dashboardAgeBuckets')} data={ageBucketData} />
      </ChartRow>
      <ChartRow>
        {noAreaCodes ? (
          <Panel collapsible persistKey="medical-dashboard-area-codes" title={t('med.dashboardAreaCodes')}>
            {t('metrics.noData')}
          </Panel>
        ) : (
          <BarChartCard persistKey="medical-dashboard-area-codes" title={t('med.dashboardAreaCodes')} data={areaData} vertical />
        )}
      </ChartRow>
    </>
  )
}

// `shapes.birthdayMonthChartData` relies on `counts.birthdaysByMonth` already being a dense
// 12-entry array (one per month, zero-filled) — a sparse list would render fewer than 12 bars
// instead of showing the months with no births at all.
