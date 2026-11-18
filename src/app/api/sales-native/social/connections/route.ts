import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { canManageMeta, prepareMetaDisconnect } from '@/server/sales-native/social/connection-policy'
import { cleanupExpiredMetaGrants } from '@/server/sales-native/social/meta-connection'
export const dynamic = 'force-dynamic'
/** Metadata-only projection. Company filtering is mandatory even for Sales administrators. */
export async function GET(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    if (!canManageMeta(actor)) return Response.json({ code:'SALES_ACCESS_DENIED' },{ status:403 })
    const db = supabaseAdmin({noStore:true})
    const [bindings,access] = await Promise.all([
      db.from('sales_social_company_bindings').select('company_code,empresas!inner(nombre,activo)')
        .eq('organization_id',actor.organizationId).eq('active',true).eq('empresas.activo',true),
      db.from('usuario_empresas_acceso').select('empresa_codigo').eq('usuario_id',actor.userId),
    ])
    if (bindings.error || access.error) throw new Error('META_COMPANY_UNAVAILABLE')
    const allowed = new Set((access.data ?? []).map(row=>row.empresa_codigo))
    const companies = (bindings.data ?? []).filter(row=>allowed.has(row.company_code)).map(row=>({
      code:row.company_code, name:(Array.isArray(row.empresas) ? row.empresas[0] : row.empresas)?.nombre || row.company_code }))
    await cleanupExpiredMetaGrants()
    const codes = companies.map(row=>row.code)
    if (!codes.length) return Response.json({data:{companies:[],integrations:[],assets:[],canManage:true,metaAvailable:false,ingestionEnabled:false}},{headers:{'Cache-Control':'no-store'}})
    const [integrations,assets,grants] = await Promise.all([
      db.from('sales_social_integrations').select('id,company_code,status,grant_id,granted_permissions,token_expires_at,provider_cleanup,provider_cleanup_error')
        .eq('organization_id',actor.organizationId).eq('provider_code','META').in('company_code',codes).order('created_at',{ascending:false}),
      db.from('sales_social_assets').select('id,account_id,company_code,external_asset_id,asset_type,display_name,status,webhook_status,reported_business_id,relationship')
        .eq('organization_id',actor.organizationId).in('company_code',codes),
      db.from('sales_social_grants').select('id,authorizer_member_id,status,authorized_at,expires_at,app_id,checked_at,health_error,sales_members(display_name,usuarios(nombre,apellido))')
        .eq('organization_id',actor.organizationId).in('company_code',codes),
    ])
    if(integrations.error || assets.error || grants.error) throw new Error('META_CONNECTION_UNAVAILABLE')
    const accounts = await db.from('sales_social_accounts').select('id,integration_id')
      .eq('organization_id',actor.organizationId).in('integration_id',(integrations.data ?? []).map(row=>row.id))
    if(accounts.error) throw new Error('META_CONNECTION_UNAVAILABLE')
    const safeAssets=(assets.data ?? []).map(a=>({...a,integrationId:accounts.data?.find(ac=>ac.id===a.account_id)?.integration_id}))
    const safeGrants=(grants.data ?? []).map(g=>{
      const member=Array.isArray(g.sales_members)?g.sales_members[0]:g.sales_members
      const user=Array.isArray(member?.usuarios)?member.usuarios[0]:member?.usuarios
      const {sales_members:_member,...grant}=g
      return {...grant,authorizer_name:member?.display_name || [user?.nombre,user?.apellido].filter(Boolean).join(' ')}
    })
    const safeConnections=(integrations.data ?? []).map(i=>({...i,
      grant:safeGrants.find(g=>g.id===i.grant_id),
      disconnect:prepareMetaDisconnect(safeAssets.filter(a=>a.integrationId===i.id).map(a=>a.external_asset_id),i.provider_cleanup),
    }))
    const env=process.env
    return Response.json({data:{companies,integrations:safeConnections,assets:safeAssets,canManage:true,
      metaAvailable:env.LILLY_META_OAUTH_ENABLED==='true' && Boolean(env.LILLY_META_APP_ID && env.LILLY_META_APP_SECRET && env.LILLY_META_GRAPH_VERSION && env.LILLY_SOCIAL_TOKEN_KEY),
      ingestionEnabled:false}},{headers:{'Cache-Control':'no-store'}})
  } catch(error){return nativeSalesErrorResponse(error)}
}
