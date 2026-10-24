import { NextResponse } from 'next/server'

/** Shared `{ error }`-at-status JSON reply every handler in this route uses to fail the same way. */
export default function respond(message: string | undefined, status: number | undefined) {
  const payload = { error: message }
  const init = { status }
  return NextResponse.json(payload, init)
}
