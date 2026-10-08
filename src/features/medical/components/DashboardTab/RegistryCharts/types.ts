import type { PatientDashboardCounts } from '@/features/medical/data/patientDashboardCounts/types'

export type ChartCounts = Pick<PatientDashboardCounts, 'gender' | 'ageBuckets' | 'areaCodes'>

export type Props = {
  counts: ChartCounts
}
