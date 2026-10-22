import { timingSafeEqual } from 'node:crypto'
import { reconcileQboEvents } from '@/server/sales-native/quickbooks/reconcile-worker'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? ''
  const provided = request.headers.get('authorization')?.replace(/^Bearer /,'') ?? ''
  const a = Buffer.from(secret)
  const b = Buffer.from(provided)
  if (!secret || a.length !== b.length || !timingSafeEqual(a,b))
    return Response.json({ code:'UNAUTHORIZED' },{ status:401 })
  if (process.env.LILLY_QBO_OAUTH_ENABLED !== 'true')
    return Response.json({ code:'QBO_OAUTH_DISABLED' },{ status:503 })
  try { return Response.json(await reconcileQboEvents(),
    { headers:{ 'Cache-Control':'no-store' } }) }
  catch { return Response.json({ code:'QBO_RECONCILIATION_UNAVAILABLE' },{ status:503 }) }
}
