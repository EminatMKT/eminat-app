import { NextResponse } from 'next/server'

/** Shared error payload and status for every failure in this route. */
export default function respond(message: string | undefined, status: number | undefined) {
  const payload = { error: message }
  const init = { status }

  return NextResponse.json(payload, init)
}

// Keeps error responses consistent without changing NextResponse's defaults for undefined values.
