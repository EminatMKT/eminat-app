export type AccessOutcome = { ok: boolean; userId?: string }
export type AccessDenial = { status?: number; error?: string }
export type Access = AccessOutcome & AccessDenial

// One flat shape, not a discriminated union: with `strict:false` `if (!authz.ok)` does not
// narrow, so the API-route guards answer optional fields call sites read without casting.
