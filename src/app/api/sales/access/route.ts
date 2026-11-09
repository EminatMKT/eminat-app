import { nativeSalesPrimary } from '@/server/sales-native/release-gate'

export const dynamic = 'force-dynamic'

/** Keep the shell's Sales entitlement on the active Sales runtime only. */
export async function GET(request: Request) {
  if (nativeSalesPrimary()) {
    const native = await import('@/app/api/sales-native/access/route')
    return native.GET(request)
  }
  return Response.json({ allowed: false }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
}
