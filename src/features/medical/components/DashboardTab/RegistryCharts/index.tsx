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

/** Renders the reference charts for the patient registry: gender split, age distribution,
 *  area-code concentration, and a birthdays-by-month placeholder (no DB aggregate exists yet). */
export default function RegistryCharts(props: Props) {
  const { counts } = props
  const { t } = useT()
  const genderData = shapes.genderChartData(counts, t)
  const genderColors = shapes.genderChartColors(t)
  const ageBucketData = shapes.ageBucketChartData(counts, t)
  const areaData = shapes.areaChartData(counts)
  // length === 0, not > 0: the no-data branch has to be the one the condition names directly.
  const noAreaCodes = counts.areaCodes.length === 0

  return (
    <>
      <ChartRow>
        <Panel collapsible persistKey="medical-dashboard-birthdays" title={t('med.dashboardBirthdaysByMonth')}>
          {t('med.dashboardUnavailable')}
        </Panel>
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

// Birthdays-by-month stays a static "not available" panel instead of a BarChartCard: the count
// module returns `birthdaysByMonth: null` until a database aggregate exists, and faking 12
// zero-bars would look like real data with nothing happening in any month.
