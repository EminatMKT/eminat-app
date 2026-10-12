import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** A read-only UTC clock for the shared topbar; never queries user data. */
export function GET() {
  return NextResponse.json({ utcMs: Date.now() }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
