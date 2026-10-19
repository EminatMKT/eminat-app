export type { NivelCandidato, DedupStrategy } from './strategy'
export type { CompareControls } from './DuplicatesTab/types'
export { default as CompareField } from './CompareField'
export { default as countPending } from './data/countPending'

// The dedup engine's public face: the strategy contract a module implements, what a module's
// comparison grid receives from the shared duplicate-review screen, the per-field compare, and
// the pending-pair count a module shows on its duplicates tab.
