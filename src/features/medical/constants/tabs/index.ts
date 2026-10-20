import { MODULE } from '@/shared/auth/permissions'
import { SUB_ITEMS } from '@/shared/components/shell/appShellConfig'

const PATIENT_LIST = 'lista'
const PATIENT_DUPLICATES = 'duplicados'

/** The tab values Medical remembers per user: its sections, and the views inside Patients. */
const MEDICAL_TABS = {
  defaultSection: 'dashboard',
  sections: SUB_ITEMS.medical.map(item => item.tab),
  patientsScope: `${MODULE.MEDICAL}-pacientes`,
  patientList: PATIENT_LIST,
  patientDuplicates: PATIENT_DUPLICATES,
  patientViews: [PATIENT_LIST, PATIENT_DUPLICATES],
} as const

export default MEDICAL_TABS

// The sections come from the sidebar (SUB_ITEMS.medical), so the two cannot drift. The Patients
// views are a second, smaller tab set with its own preference scope, so neither overwrites the other.
