import { NextResponse } from 'next/server'
import type { Access } from '@/shared/db/types'

/** Runs an access check; a denial is answered with its status and error, an allowance is `null`. */
export default async function guard(check: () => Promise<Access>): Promise<NextResponse | null> {
  const { ok, status, error } = await check()
  if (ok) return null
  const body = { error }
  const init = { status }
  return NextResponse.json(body, init)
}

// One shape for every guard (`requireAdmin`, `requireModule`, later the Meet actor): the
// handler writes `const denial = await guard(check); if (denial) return denial`.
