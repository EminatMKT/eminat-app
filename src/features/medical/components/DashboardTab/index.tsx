'use client'
import { useMedical } from '@/features/medical/components/MedicalContext'
import RegistryKpis from './RegistryKpis'
import RegistryCharts from './RegistryCharts'
import RegistryQualityPanel from './RegistryQualityPanel'

export default function DashboardTab() {
  const { patientDashboard } = useMedical()
  const { counts, loading, error } = patientDashboard
  return (
    <>
      <RegistryKpis counts={counts} loading={loading} error={error} />
      {counts && <RegistryCharts counts={counts} />}
      {counts && <RegistryQualityPanel dataQuality={counts.dataQuality} />}
    </>
  )
}
