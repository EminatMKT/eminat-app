import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { listMetaCompanies, manageMetaCompany } from '@/server/sales-native/social/company-onboarding'
import { readMetaInput } from '@/server/sales-native/social/input'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET(request: Request) {
  try {
    const data = await listMetaCompanies(await resolveSalesActor(request))
    return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
export async function POST(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    const data = await manageMetaCompany(actor, await readMetaInput(request))
    return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
