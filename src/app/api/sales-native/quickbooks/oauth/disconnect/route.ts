import { nativeSalesErrorResponse } from '@/server/sales-native/auth'
import { disconnectQboConnection } from '@/server/sales-native/quickbooks/connection'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const disconnected = await disconnectQboConnection(request)
    return Response.json({ disconnected }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
