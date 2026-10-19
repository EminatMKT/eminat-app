export { getPaciente } from './pacientes'
export { default as patientNames } from './patientNames'
export { default as patientContacts } from './patientContacts'
export type { PatientContactRow } from './patientContacts/types'

// What Medical's data layer offers to its components, so a component reading two of these imports
// one directory once. Older callers still import `./pacientes` by path until they are touched.
