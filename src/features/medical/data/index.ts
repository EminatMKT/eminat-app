export { getPaciente } from './pacientes'
export { default as patientNames } from './patientNames'

// What Medical's data layer offers to its components, so a component reading two of these imports
// one directory once. Older callers still import `./pacientes` by path until they are touched.
