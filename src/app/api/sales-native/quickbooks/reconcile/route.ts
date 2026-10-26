import { workerAuthorized } from '@/server/sales-native/quickbooks/worker-auth'
import { reconcileQboEvents } from '@/server/sales-native/quickbooks/reconcile-worker'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (!workerAuthorized(request, true))
    return Response.json({ code:'UNAUTHORIZED' },{ status:401 })
  if (process.env.LILLY_QBO_OAUTH_ENABLED !== 'true')
    return Response.json({ code:'QBO_OAUTH_DISABLED' },{ status:503 })
  try { return Response.json(await reconcileQboEvents(),
    { headers:{ 'Cache-Control':'no-store' } }) }
  catch { return Response.json({ code:'QBO_RECONCILIATION_UNAVAILABLE' },{ status:503 }) }
}
