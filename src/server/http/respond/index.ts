import { NextResponse } from 'next/server'
import type { Result, RespondPolicy } from '../types'

const SERVER_ERROR = 500

const catalogText = (entry: unknown) => (typeof entry === 'string' ? entry : '')

/** Turns a use case's result into the HTTP answer: status by error key, text from the catalog. */
export default function respond<T>(result: Result<T>, policy: RespondPolicy): NextResponse {
  const {
    ok,
    data,
    error,
    message,
    extra,
  } = result
  const failureStatus = policy.status[error] ?? SERVER_ERROR
  const init = { status: ok ? policy.success : failureStatus }
  if (ok) return NextResponse.json(data, init)
  const text = message || catalogText(policy.catalog[error])
  const body = { error: text, ...extra }
  return NextResponse.json(body, init)
}

// The only place an error key becomes an HTTP status: services return keys, handlers declare
// the key → status table in their policy, and this answers `{ error, ...extra }`.
