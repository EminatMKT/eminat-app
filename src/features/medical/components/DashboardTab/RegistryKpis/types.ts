import type { PatientDashboardCounts } from '@/features/medical/data/patientDashboardCounts/types'

export type RegistryCounts = Pick<PatientDashboardCounts, 'totalPatients' | 'withEmail' | 'withoutEmail' | 'birthdaysThisMonth'>

export type Props = {
  counts: RegistryCounts | null
  loading: boolean
  error: Error | null
}
