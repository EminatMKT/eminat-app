// features/billing-v1/index.ts — public API of the legacy billing feature.
// The folder is billing-v1, the stored permission value stays `cobranzas`.
export { default as BillingV1Module } from './components/BillingV1Module'

// Access-aware convention (read by the access-control plan; no logic yet)
export const access = { module: 'cobranzas' } as const
