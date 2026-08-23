// Barrel de `src/shared/import`: lector de .xlsx genérico (`parseWorkbook`) + plan de import
// genérico (`buildImportPlan`) + el contrato de identidad que lo parametriza + el modal que los
// une. Ninguno conoce un lead ni un paciente — ver `identity.ts` y el comentario de `ImportModal`.
export { parseWorkbook, readSheet } from './parseWorkbook'
export { buildImportPlan } from './buildImportPlan'
export type { Identity, ImportPlan, MergeCandidate, CandidatoFusion, NivelCandidato, SanitizeIssue } from './identity'
export { default as ImportModal } from './ImportModal'
export type { ImportFieldDef, DupMode, ValueMap } from './ImportModal'
export type { MergeCandidateDisplay } from './MergeCandidateRow'
