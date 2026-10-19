import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { salesCan } from '@/server/sales-native/policy'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'

/** Connection metadata only; never select token ciphertext or verifier material. */
export async function GET(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    if (!salesCan(actor, 'sales:social:manage'))
      return Response.json({ code: 'SALES_ACCESS_DENIED' }, { status: 403 })
    const db = supabaseAdmin()
    const { data: provider, error: providerError } = await db.from('sales_social_providers')
      .select('enabled').eq('code', 'META').maybeSingle()
    if (providerError) return nativeSalesDatabaseError(providerError)
    const { data: integrations, error } = await db.from('sales_social_integrations')
      .select('id,provider_code,status,external_business_name,connected_at,token_expires_at,last_refresh_at,last_error_code')
      .eq('organization_id', actor.organizationId).order('created_at', { ascending: false }).limit(100)
    if (error) return nativeSalesDatabaseError(error)
    const { data: assets, error: assetError } = await db.from('sales_social_assets')
      .select('id,account_id,asset_type,display_name,status,webhook_status,last_event_at')
      .eq('organization_id', actor.organizationId).order('display_name', { ascending: true }).limit(500)
    if (assetError) return nativeSalesDatabaseError(assetError)
    const metaAvailable = provider?.enabled === true &&
      process.env.LILLY_META_OAUTH_ENABLED === 'true' &&
      Boolean(process.env.LILLY_META_APP_ID && process.env.LILLY_META_APP_SECRET &&
        process.env.LILLY_META_GRAPH_VERSION && process.env.LILLY_SOCIAL_TOKEN_KEY)
    return Response.json({ data: { integrations: integrations ?? [], assets: assets ?? [], metaAvailable } },
      { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
