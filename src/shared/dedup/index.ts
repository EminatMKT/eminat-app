export type { NivelCandidato, DedupStrategy } from './types'
export type { CompareControls } from './DuplicatesTab/types'
export { default as CompareField } from './CompareField'
export { default as mergeMultiValueRows } from './CompareField/mergeMultiValueRows'
export { default as countPending } from './data/countPending'

// The dedup engine's public face: the strategy contract a module implements, what a module's
// comparison grid receives from the shared duplicate-review screen, the per-field compare (and
// its merge-by-text of multivalued rows, so a caller's preview groups them the same way), and
// the pending-pair count a module shows on its duplicates tab.
