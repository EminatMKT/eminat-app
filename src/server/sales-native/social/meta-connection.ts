import 'server-only'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { NativeSalesAuthError, resolveSalesActor } from '../auth'
import type { SalesActor } from '../policy'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { MetaGraphClient } from './meta-graph'
import { openSocialToken, sealSocialToken } from './token-vault'
import { canManageMeta, connectionInput, disconnectInput, metaReturnPath, selectionInput } from './connection-policy'

function hash(state: string) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(state)) throw new NativeSalesAuthError(422, 'META_STATE_INVALID')
  return createHash('sha256').update(state).digest('hex')
}
function failure(code: string, status = 403): never { throw new NativeSalesAuthError(status, code) }
function databaseFailure(error: { code: string; message: string } | null, code: string): never {
  if (error && ['META_ASSET_ALREADY_RESERVED','META_COMPANY_ACCESS_DENIED','META_GRANT_UNAVAILABLE'].includes(error.message))
    failure(error.message, error.message === 'META_COMPANY_ACCESS_DENIED' ? 403 : 409)
  failure(code, 503)
}
export function metaConfiguration() {
  const env = process.env
  if (env.LILLY_META_OAUTH_ENABLED !== 'true' || !env.LILLY_META_APP_ID || !env.LILLY_META_APP_SECRET ||
    !env.LILLY_META_GRAPH_VERSION || !env.LILLY_SOCIAL_TOKEN_KEY) failure('META_NOT_CONFIGURED', 503)
  return { appId: env.LILLY_META_APP_ID, key: env.LILLY_SOCIAL_TOKEN_KEY,
    client: new MetaGraphClient({ appId: env.LILLY_META_APP_ID, appSecret: env.LILLY_META_APP_SECRET,
      version: env.LILLY_META_GRAPH_VERSION,
      callback: 'https://app.stratixsolutions.us/api/sales-native/social/meta/callback' }) }
}
export async function requireMetaCompany(actor: SalesActor, company: string) {
  if (!canManageMeta(actor)) failure('SALES_ACCESS_DENIED')
  const { error } = await supabaseAdmin({ noStore: true }).rpc('native_meta_require_company', {
    p_org: actor.organizationId, p_member: actor.memberId, p_company: company })
  if (error) failure('META_COMPANY_ACCESS_DENIED')
}
export async function cleanupExpiredMetaGrants() {
  const { error } = await supabaseAdmin({ noStore: true }).rpc('native_meta_expire_access')
  if (error) failure('META_STATE_UNAVAILABLE', 503)
}
export async function beginMetaConnection(actor: SalesActor, input: unknown) {
  const parsed = connectionInput.safeParse(input)
  if (!parsed.success) failure('META_CONNECTION_INVALID', 422)
  await requireMetaCompany(actor, parsed.data.companyCode)
  const { client, appId } = metaConfiguration()
  await cleanupExpiredMetaGrants()
  const state = randomBytes(32).toString('base64url')
  const { error } = await supabaseAdmin({ noStore: true }).rpc('native_meta_begin', {
    p_org: actor.organizationId, p_member: actor.memberId, p_company: parsed.data.companyCode,
    p_hash: hash(state), p_app: appId, p_reconnect: parsed.data.reconnectIntegrationId ?? null, p_instagram: parsed.data.includeInstagram })
  if (error) databaseFailure(error, 'META_STATE_UNAVAILABLE')
  return { url: client.connectionAuthorizationUrl(state, parsed.data.includeInstagram) }
}
async function authorizedState(state: string, actor: SalesActor) {
  if (!canManageMeta(actor)) failure('SALES_ACCESS_DENIED')
  const { data, error } = await supabaseAdmin({ noStore: true }).from('sales_social_oauth_states')
    .select('id,organization_id,requester_member_id,company_code,app_id,status,expires_at,grant_ciphertext,grant_expires_at,reconnect_integration_id')
    .eq('state_hash', hash(state)).maybeSingle()
  if (error || !data || data.organization_id !== actor.organizationId || data.requester_member_id !== actor.memberId ||
    !data.company_code || data.status !== 'EXCHANGED' || Date.parse(data.expires_at) <= Date.now()) failure('META_GRANT_UNAVAILABLE')
  await requireMetaCompany(actor, data.company_code)
  if (data.app_id !== metaConfiguration().appId) failure('META_GRANT_UNAVAILABLE')
  return data
}
export async function metaCallbackContext(state: string, accessToken: string) {
  const { data, error } = await supabaseAdmin({ noStore: true }).from('sales_social_oauth_states')
    .select('organization_id,requester_member_id,company_code,status,expires_at')
    .eq('state_hash', hash(state)).maybeSingle()
  if (error || !data || !data.company_code || data.status !== 'PENDING' || Date.parse(data.expires_at) <= Date.now())
    failure('META_GRANT_UNAVAILABLE')
  const actor = await resolveSalesActor(new Request('https://app.stratixsolutions.us', { headers: {
    Authorization: `Bearer ${accessToken}`, 'X-Sales-Organization-Id': data.organization_id } }))
  if (actor.memberId !== data.requester_member_id || actor.organizationId !== data.organization_id) failure('META_GRANT_UNAVAILABLE')
  await requireMetaCompany(actor, data.company_code)
  return metaReturnPath(actor.organizationId, data.company_code)
}
export async function exchangeMetaConnection(state: string, code: string, accessToken: string) {
  const db = supabaseAdmin({ noStore: true })
  const { data: pending, error } = await db.from('sales_social_oauth_states').select('organization_id')
    .eq('state_hash', hash(state)).maybeSingle()
  if (error || !pending) failure('META_GRANT_UNAVAILABLE')
  const actor = await resolveSalesActor(new Request('https://app.stratixsolutions.us', { headers: {
    Authorization: `Bearer ${accessToken}`, 'X-Sales-Organization-Id': pending.organization_id } }))
  const { data: claimed, error: claimError } = await db.rpc('native_meta_exchange_claim', {
    p_hash: hash(state), p_org: actor.organizationId, p_member: actor.memberId })
  if (claimError || !claimed) failure('META_GRANT_UNAVAILABLE')
  const { client, key, appId } = metaConfiguration()
  if (claimed.appId !== appId) failure('META_GRANT_UNAVAILABLE')
  try {
    const grant = await client.exchange(code)
    const [permissions, metaUserId] = await Promise.all([
      client.grantedPermissions(grant.token), client.authorizingUserId(grant.token) ])
    if (!permissions.includes('pages_show_list')) failure('META_PERMISSION_UNAVAILABLE', 409)
    const pages = await client.discoverPages(grant.token, permissions.includes('instagram_basic'))
    const assets = pages.flatMap(page => {
      const seal = (type: 'page' | 'instagram', externalId: string, name: string, parentId: string | null) => {
        const id = randomUUID()
        return { id, externalId, type, name, parentId, businessId: page.business?.id ?? null,
          businessName: page.business?.name ?? null, tasks: page.tasks ?? [],
          ciphertext: sealSocialToken(page.access_token, key, actor.organizationId, id) }
      }
      return [seal('page', page.id, page.name, null), ...(page.instagram_business_account
        ? [seal('instagram', page.instagram_business_account.id, `${page.name} · Instagram`, page.id)] : [])]
    })
    const { error: finishError } = await db.rpc('native_meta_exchange_finish', {
      p_state: claimed.id, p_org: actor.organizationId, p_member: actor.memberId,
      p_meta_user: metaUserId, p_user_ciphertext: sealSocialToken(grant.token, key, actor.organizationId, claimed.id),
      p_expires: grant.expiresAt.toISOString(), p_permissions: permissions, p_assets: assets })
    if (finishError) failure('META_GRANT_UNAVAILABLE', 409)
    return { returnPath: metaReturnPath(actor.organizationId, claimed.company), state }
  } catch {
    await db.from('sales_social_oauth_states').update({ status: 'FAILED', grant_ciphertext: null })
      .eq('id', claimed.id).eq('status', 'EXCHANGING')
    failure('META_AUTHORIZATION_FAILED', 409)
  }
}
export async function listMetaGrantPages(actor: SalesActor, state: string) {
  const row = await authorizedState(state, actor)
  const { data, error } = await supabaseAdmin({ noStore: true }).from('sales_social_discovered_assets')
    .select('id,external_id,asset_type,display_name,parent_external_id,reported_business_id,reported_business_name,tasks')
    .eq('organization_id', actor.organizationId).eq('state_id', row.id).order('external_id').limit(2001)
  if (error || !data || data.length > 2000) failure('META_DISCOVERY_UNAVAILABLE', 503)
  return { companyCode: row.company_code, assets: data } // Frozen authorization context, not the URL company hint.
}
export async function completeMetaConnection(actor: SalesActor, input: unknown) {
  const parsed = selectionInput.safeParse(input)
  if (!parsed.success) failure('META_SELECTION_INVALID', 422)
  const row = await authorizedState(parsed.data.state, actor)
  if (!row.grant_ciphertext || !row.grant_expires_at || Date.parse(row.grant_expires_at) <= Date.now()) failure('META_GRANT_UNAVAILABLE')
  const { key } = metaConfiguration()
  const db = supabaseAdmin({ noStore: true })
  const { data: assets, error } = await db.from('sales_social_discovered_assets').select('id,token_ciphertext')
    .eq('state_id', row.id).eq('organization_id', actor.organizationId).in('id', parsed.data.assetIds)
  if (error || assets?.length !== parsed.data.assetIds.length) failure('META_SELECTION_INVALID', 422)
  const integrationId = row.reconnect_integration_id ?? randomUUID()
  const grantId = randomUUID()
  const selected = assets.map(asset => ({ id: asset.id,
    ciphertext: sealSocialToken(openSocialToken(asset.token_ciphertext, key, actor.organizationId, asset.id),
      key, actor.organizationId, integrationId) }))
  const { data, error: completeError } = await db.rpc('native_meta_complete', {
    p_org: actor.organizationId, p_member: actor.memberId, p_state: row.id, p_grant: grantId, p_integration: integrationId,
    p_user_ciphertext: sealSocialToken(openSocialToken(row.grant_ciphertext, key, actor.organizationId, row.id),
      key, actor.organizationId, grantId), p_selected: selected, p_relationship: parsed.data.relationship })
  if (completeError || !data) databaseFailure(completeError, 'META_CONNECTION_UNAVAILABLE')
  return data
}
export async function revokeMetaConnection(actor: SalesActor, input: unknown) {
  const parsed = disconnectInput.safeParse(input)
  if (!parsed.success) failure('META_CONNECTION_INVALID', 422)
  if (!canManageMeta(actor)) failure('SALES_ACCESS_DENIED')
  const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_meta_disconnect', {
    p_org: actor.organizationId, p_member: actor.memberId, p_integration: parsed.data.integrationId })
  if (error || !data) databaseFailure(error, 'META_CONNECTION_UNAVAILABLE')
  return data
}
/** Deliberately unavailable: Phase 1 never subscribes or treats token exchange as perpetual refresh. */
export async function subscribeMetaLeadgen(_actor: SalesActor, _input: unknown): Promise<never> {
  failure('META_INGESTION_DISABLED', 409)
}
export async function refreshMetaConnection(_actor: SalesActor, _input: unknown): Promise<never> {
  failure('META_RECONNECT_REQUIRED', 409)
}

/** Read-only Graph health query; no subscriptions, replies or refresh assumptions. */
export async function checkMetaConnectionHealth(actor: SalesActor, input: unknown) {
  const parsed = disconnectInput.safeParse(input)
  if (!parsed.success) failure('META_CONNECTION_INVALID',422)
  if (!canManageMeta(actor)) failure('SALES_ACCESS_DENIED')
  await cleanupExpiredMetaGrants()
  const db = supabaseAdmin({noStore:true})
  const {data:connection,error} = await db.from('sales_social_integrations').select('id,company_code,grant_id,status')
    .eq('organization_id',actor.organizationId).eq('provider_code','META').eq('id',parsed.data.integrationId).maybeSingle()
  if(error || !connection || !connection.company_code) failure('META_CONNECTION_UNAVAILABLE',404)
  await requireMetaCompany(actor,connection.company_code)
  const {data:grant,error:grantError}=await db.from('sales_social_grants').select('id,status,token_ciphertext,expires_at,app_id')
    .eq('organization_id',actor.organizationId).eq('id',connection.grant_id).maybeSingle()
  if(grantError || !grant || grant.status!=='ACTIVE' || !grant.token_ciphertext || Date.parse(grant.expires_at)<=Date.now())
    failure('META_RECONNECT_REQUIRED',409)
  const {client,key,appId}=metaConfiguration()
  if(grant.app_id!==appId) failure('META_RECONNECT_REQUIRED',409)
  const token=openSocialToken(grant.token_ciphertext,key,actor.organizationId,grant.id)
  const permissionHealth=await client.connectionHealth(token)
  const result:{status:string;permissions:string[]}={...permissionHealth}
  if(result.status==='ACTIVE'){
    const accounts=await db.from('sales_social_accounts').select('id')
      .eq('organization_id',actor.organizationId).eq('integration_id',connection.id)
    if(accounts.error) failure('META_CONNECTION_UNAVAILABLE',503)
    const assets=await db.from('sales_social_assets').select('external_asset_id')
      .eq('organization_id',actor.organizationId).eq('company_code',connection.company_code)
      .in('account_id',(accounts.data ?? []).map(a=>a.id)).eq('status','READY')
    if(assets.error) failure('META_CONNECTION_UNAVAILABLE',503)
    try{
      const pages=await client.discoverPages(token,result.permissions.includes('instagram_basic'))
      const permitted=new Set(pages.flatMap(p=>[p.id,...(p.instagram_business_account?[p.instagram_business_account.id]:[])]))
      if(!assets.data?.length || assets.data.some(a=>!permitted.has(a.external_asset_id)))result.status='ASSET_ACCESS_REMOVED'
    }catch{result.status='PROVIDER_UNAVAILABLE'}
  }
  const {error:recordError}=await db.rpc('native_meta_record_health',{
    p_org:actor.organizationId,p_member:actor.memberId,p_integration:connection.id,p_grant:grant.id,
    p_result:result.status,p_permissions:result.permissions})
  if(recordError) failure('META_HEALTH_CHANGED',409)
  return result
}
