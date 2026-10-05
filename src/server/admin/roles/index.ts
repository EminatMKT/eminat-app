export { default as roleFailure } from './role-failure'
export { default as ROLE_HTTP } from './role-http'

// What both role routes share: the SQLSTATE-to-answer mapping of `save_role` and the response
// bodies and inits, so the collection route and the `[key]` route answer the same failures the
// same way. Server-only, like everything under `src/server/`.
