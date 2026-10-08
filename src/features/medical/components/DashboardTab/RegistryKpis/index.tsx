'use client'
import { useT } from '@/shared/i18n'
import { LoadingView, ErrorList } from '@/shared/components/ui'
import type { Props } from './types'
import stats from './stats'
import StatGrid from './StatGrid'
import s from './index.module.css'

/** Patient-registry KPI row. Registry values stay a dash until `counts` resolves. */
export default function RegistryKpis(props: Props) {
  const { counts, loading, error } = props
  const { t } = useT()
  const registryStats = stats.registryStats(counts, t)

  return (
    <>
      {loading && <LoadingView />}
      {error && <ErrorList errores={['med.dashboardLoadError']} />}
      <StatGrid className={s.grid} stats={registryStats} />
    </>
  )
}
// This StatGrid reads the patient-registry truth: `DashboardTab` used to append a second,
// demo-data-fed operational row here, removed once that data stopped being real.
