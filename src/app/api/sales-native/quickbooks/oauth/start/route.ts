import { nativeSalesErrorResponse } from '@/server/sales-native/auth'
import { beginQboConnection } from '@/server/sales-native/quickbooks/connection'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const url = await beginQboConnection(request)
    return Response.json({ url }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
