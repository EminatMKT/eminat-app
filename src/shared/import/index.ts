// Barrel de `src/shared/import`: lector de .xlsx genérico (`parseWorkbook`) + plan de import
// genérico (`buildImportPlan`) + el contrato de identidad que lo parametriza. Ninguno de los
// tres conoce un lead ni un paciente — ver `identity.ts`.
export { parseWorkbook, readSheet } from './parseWorkbook'
export { buildImportPlan } from './buildImportPlan'
export type { Identity, ImportPlan, MergeCandidate, CandidatoFusion, NivelCandidato } from './identity'
