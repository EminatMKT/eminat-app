export { default as respond } from './respond'
export { default as parse } from './parse'
export { default as guard } from './guard'
export type { Result, RespondPolicy } from './types'

// The HTTP kit every handler uses: guard the caller, parse the body against a contract, and
// answer the use case's result. Server-only, like everything under `src/server/`.
