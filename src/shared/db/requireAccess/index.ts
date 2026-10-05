export { default as requireModule } from './requireModule'

// Server-only guards for the non-admin API routes, kept out of the browser-safe `@/shared/db`
// barrel (they read `next/headers`). Routes import them from here; `ssrClient` stays internal.
