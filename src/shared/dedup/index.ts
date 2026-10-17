export type { NivelCandidato, DedupStrategy } from './strategy'
export type { CompareControls } from './DuplicatesTab/types'
export { default as CompareField } from './CompareField'

// The dedup engine's public face: the strategy contract a module implements, what a module's
// comparison grid receives from the shared duplicate-review screen, and the per-field compare.
