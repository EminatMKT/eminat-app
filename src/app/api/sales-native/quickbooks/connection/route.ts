import { nativeSalesErrorResponse } from '@/server/sales-native/auth'
import { qboManager, readConnectedQboCompany } from
  '@/server/sales-native/quickbooks/connection'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Read-only company probe. Never returns OAuth credentials or provider bodies. */
export async function GET(request: Request) {
  try {
    await qboManager(request)
    const company = await readConnectedQboCompany()
    return Response.json({ connected: true,company },
      { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}

/** Administrator-only diagnostic: rotate using the normal encrypted token lease. */
export async function POST(request: Request) {
  try {
    await qboManager(request)
    const company = await readConnectedQboCompany(true)
    return Response.json({ connected: true, refreshed: true, company },
      { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
