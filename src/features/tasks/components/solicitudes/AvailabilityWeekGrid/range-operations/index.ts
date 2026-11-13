export { default as commitRange } from './validate'
export { default as replaceBounds } from './replace-bounds'

// Barrel for the week-level range operations: validation, bounds replacement, and creation
// each live in their own file; this index re-exports only what callers outside this folder use.
