/** A use case's outcome; `error` is a catalog key, `message` overrides its text with runtime detail. */
export type Result<T> = {
  ok: boolean
  data?: T
  error?: string
  message?: string
  extra?: Record<string, unknown>
}

/** How `respond` answers a result: the success status, the status per error key and the catalog. */
export type RespondPolicy = {
  success: number
  status: Record<string, number>
  catalog: Record<string, unknown>
}

/** One rejected field, as zod reports it. */
export type Issue = { message: string }

/** The rejection: its issues in order. */
export type Rejection = { issues: Issue[] }

/** A contract's verdict; structurally zod's `safeParse` result. */
export type Validation<T> = {
  success: boolean
  data?: T
  error?: Rejection
}

/** A contract: validates an unknown body. */
export type Validate<T> = (body: unknown) => Validation<T>

// Flat shapes, not discriminated unions: the repo compiles with `strict:false`, where
// `if (!result.ok)` does not narrow (same reason as `Access` in `@/shared/db/types`).
