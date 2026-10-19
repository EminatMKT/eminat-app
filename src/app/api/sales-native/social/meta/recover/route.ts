import { timingSafeEqual } from 'node:crypto'
import { nativeSalesEnabled } from '@/server/sales-native/release-gate'
import { recoverNativeMetaLeads } from '@/server/sales-native/social/lead-recovery'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (!nativeSalesEnabled()) return Response.json({ code: 'NOT_FOUND' }, { status: 404 })
  const expected = Buffer.from(process.env.CRON_SECRET ?? '')
  const authorization = request.headers.get('authorization') ?? ''
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  const actual = Buffer.from(supplied)
  if (!expected.length || expected.length !== actual.length || !timingSafeEqual(expected, actual))
    return Response.json({ code: 'NOT_FOUND' }, { status: 404 })
  try {
    const result = await recoverNativeMetaLeads()
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return Response.json({ code: 'META_RECOVERY_UNAVAILABLE' }, { status: 503 }) }
}
