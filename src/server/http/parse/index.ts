import type { Result, Validate } from '../types'

/** Reads the JSON body and runs it through a contract; a rejection's first issue is the error key. */
export default async function parse<T>(req: Request, validate: Validate<T>): Promise<Result<T>> {
  const body: unknown = await req.json()
  const verdict = validate(body)
  const firstIssue = verdict.error?.issues[0]
  const accepted: Result<T> = { ok: true, data: verdict.data }
  const rejected: Result<T> = { ok: false, error: firstIssue?.message }
  return verdict.success ? accepted : rejected
}

// Contracts write catalog keys as their issue messages, so the rejection maps straight to a
// status and text in `respond`. A body that is not JSON throws: the handler answers it as 500.
