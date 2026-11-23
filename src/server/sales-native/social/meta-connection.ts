import 'server-only'
import { resolveMetaDeployment, requireMetaRequest } from '../../../../meta-qa-isolation.cjs'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { NativeSalesAuthError, resolveSalesActor } from '../auth'
import type { SalesActor } from '../policy'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { MetaGraphClient } from './meta-graph'
import { openSocialToken, sealSocialToken } from './token-vault'
import { canManageMeta, connectionInput, DEFAULT_META_RETURN_PATH, disconnectInput, metaReturnPath, prepareMetaDisconnect, resolveMetaEntryPath, selectionInput } from './connection-policy'

function hash(state: string) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(state)) throw new NativeSalesAuthError(422, 'META_STATE_INVALID')
  const deployment = metaDeployment()
  return createHash('sha256').update(JSON.stringify(['lilly-meta-state-v2', deployment.environment,
    deployment.callback, deployment.context, state])).digest('hex')
}
function failure(code: string, status = 403): never { throw new NativeSalesAuthError(status, code) }
function databaseFailure(error: { code: string; message: string } | null, code: string): never {
  if (error && ['META_ASSET_ALREADY_RESERVED','META_COMPANY_ACCESS_DENIED','META_GRANT_UNAVAILABLE'].includes(error.message))
    failure(error.message, error.message === 'META_COMPANY_ACCESS_DENIED' ? 403 : 409)
  failure(code, 503)
}
export function metaDeployment(request?: Request) {
  try {
    const deployment = resolveMetaDeployment(process.env)
    if (request) requireMetaRequest(request, deployment)
    return deployment
  } catch { failure('META_DEPLOYMENT_ISOLATION_REQUIRED', 503) }
}
export function metaConfiguration() {
  const env = process.env
  if (env.LILLY_META_OAUTH_ENABLED !== 'true' || !env.LILLY_META_APP_ID || !env.LILLY_META_APP_SECRET ||
    !env.LILLY_META_GRAPH_VERSION || !env.LILLY_SOCIAL_TOKEN_KEY) failure('META_NOT_CONFIGURED', 503)
  return { appId: env.LILLY_META_APP_ID, key: env.LILLY_SOCIAL_TOKEN_KEY,
    client: new MetaGraphClient({ appId: env.LILLY_META_APP_ID, appSecret: env.LILLY_META_APP_SECRET,
      version: env.LILLY_META_GRAPH_VERSION,
      callback: metaDeployment().callback }) }
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
export async function beginMetaConnection(actor: SalesActor, input: unknown, request?: Request) {
  const parsed = connectionInput.safeParse(input)
  if (!parsed.success) failure('META_CONNECTION_INVALID', 422)
  await requireMetaCompany(actor, parsed.data.companyCode)
  const { client, appId } = metaConfiguration()
  await cleanupExpiredMetaGrants()
  const db = supabaseAdmin({ noStore: true })
  const { data: provider } = await db.from('sales_social_providers').select('enabled').eq('code', 'META').maybeSingle()
  if (!provider?.enabled) failure('META_PROVIDER_DISABLED', 503)
  const state = randomBytes(32).toString('base64url')
  const { data: stateId, error } = await db.rpc('native_meta_begin', {
    p_org: actor.organizationId, p_member: actor.memberId, p_company: parsed.data.companyCode,
    p_hash: hash(state), p_app: appId, p_reconnect: parsed.data.reconnectIntegrationId ?? null, p_instagram: parsed.data.includeInstagram })
  if (error) databaseFailure(error, 'META_STATE_UNAVAILABLE')
  const returnPath = resolveMetaEntryPath(request)
  if (returnPath !== DEFAULT_META_RETURN_PATH) {
    const { error: returnPathError } = await db.from('sales_social_oauth_states').update({ return_path: returnPath }).eq('id', stateId)
    if (returnPathError) failure('META_STATE_UNAVAILABLE', 503)
  }
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
    .select('organization_id,requester_member_id,company_code,status,expires_at,return_path')
    .eq('state_hash', hash(state)).maybeSingle()
  if (error || !data || !data.company_code || data.status !== 'PENDING' || Date.parse(data.expires_at) <= Date.now())
    failure('META_GRANT_UNAVAILABLE')
  const actor = await resolveSalesActor(new Request(metaDeployment().origin, { headers: {
    Authorization: `Bearer ${accessToken}`, 'X-Sales-Organization-Id': data.organization_id } }))
  if (actor.memberId !== data.requester_member_id || actor.organizationId !== data.organization_id) failure('META_GRANT_UNAVAILABLE')
  await requireMetaCompany(actor, data.company_code)
  return metaReturnPath(actor.organizationId, data.company_code, data.return_path)
}
export async function exchangeMetaConnection(state: string, code: string, accessToken: string) {
  const stateHash = hash(state)
  const db = supabaseAdmin({ noStore: true })
  const { data: pending, error } = await db.from('sales_social_oauth_states').select('organization_id,return_path')
    .eq('state_hash', hash(state)).maybeSingle()
  if (error || !pending) failure('META_GRANT_UNAVAILABLE')
  const actor = await resolveSalesActor(new Request(metaDeployment().origin, { headers: {
    Authorization: `Bearer ${accessToken}`, 'X-Sales-Organization-Id': pending.organization_id } }))
  const { data: claimed, error: claimError } = await db.rpc('native_meta_exchange_claim', {
    p_hash: stateHash, p_org: actor.organizationId, p_member: actor.memberId })
  // hash() re-resolves live deployment context (metaDeployment()), so this also catches
  // the context drifting mid-flight, not just the trivially-unchanged `state`/`stateHash`
  // (confirmed load-bearing by meta-connection.test.ts; PR #209 review finding #7 misread
  // this as dead code).
  if (claimError || !claimed || hash(state) !== stateHash) failure('META_GRANT_UNAVAILABLE')
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
    if (hash(state) !== stateHash) failure('META_GRANT_UNAVAILABLE')
    const { error: finishError } = await db.rpc('native_meta_exchange_finish', {
      p_state: claimed.id, p_org: actor.organizationId, p_member: actor.memberId,
      p_meta_user: metaUserId, p_user_ciphertext: sealSocialToken(grant.token, key, actor.organizationId, claimed.id),
      p_expires: grant.expiresAt.toISOString(), p_permissions: permissions, p_assets: assets })
    if (finishError) failure('META_GRANT_UNAVAILABLE', 409)
    return { returnPath: metaReturnPath(actor.organizationId, claimed.company, pending.return_path), state }
  } catch (cause) {
    await db.from('sales_social_oauth_states').update({ status: 'FAILED', grant_ciphertext: null })
      .eq('id', claimed.id).eq('status', 'EXCHANGING')
    // Only the provider-reported permission outcome is specific enough to be worth telling
    // apart from "Meta API was down" (finding #5); every other internal failure, including
    // the deployment-context recheck above, still collapses to one generic code so a caller
    // can't use this response to probe which internal check tripped.
    if (cause instanceof NativeSalesAuthError && cause.code === 'META_PERMISSION_UNAVAILABLE') throw cause
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

/** Moved out of connections/route.ts (PR #209 review, finding #10: route.ts must only
 * export HTTP handlers). metaAvailable now also checks the DB kill-switch, and canManage
 * reflects the real permission instead of a hardcoded true (findings #3 and #6). */
export async function listMetaConnections(actor: SalesActor) {
  const canManage = canManageMeta(actor)
  if (!canManage) failure('SALES_ACCESS_DENIED')
  const db = supabaseAdmin({ noStore: true })
  const [bindings, access, provider] = await Promise.all([
    db.from('sales_social_company_bindings').select('company_code,empresas!inner(nombre,activo)')
      .eq('organization_id', actor.organizationId).eq('active', true).eq('empresas.activo', true),
    db.from('usuario_empresas_acceso').select('empresa_codigo').eq('usuario_id', actor.userId),
    db.from('sales_social_providers').select('enabled').eq('code', 'META').maybeSingle(),
  ])
  if (bindings.error || access.error) failure('META_COMPANY_UNAVAILABLE', 503)
  const allowed = new Set((access.data ?? []).map(row => row.empresa_codigo))
  const companies = (bindings.data ?? []).filter(row => allowed.has(row.company_code)).map(row => ({
    code: row.company_code, name: (Array.isArray(row.empresas) ? row.empresas[0] : row.empresas)?.nombre || row.company_code }))
  await cleanupExpiredMetaGrants()
  const env = process.env
  const metaAvailable = env.LILLY_META_OAUTH_ENABLED === 'true' &&
    Boolean(env.LILLY_META_APP_ID && env.LILLY_META_APP_SECRET && env.LILLY_META_GRAPH_VERSION && env.LILLY_SOCIAL_TOKEN_KEY) &&
    Boolean(provider.data?.enabled)
  const codes = companies.map(row => row.code)
  if (!codes.length) return { companies: [], integrations: [], assets: [], canManage, metaAvailable, ingestionEnabled: false }
  const [integrations, assets, grants] = await Promise.all([
    db.from('sales_social_integrations').select('id,company_code,status,grant_id,granted_permissions,token_expires_at,provider_cleanup,provider_cleanup_error')
      .eq('organization_id', actor.organizationId).eq('provider_code', 'META').in('company_code', codes).order('created_at', { ascending: false }),
    db.from('sales_social_assets').select('id,account_id,company_code,external_asset_id,asset_type,display_name,status,webhook_status,reported_business_id,relationship')
      .eq('organization_id', actor.organizationId).in('company_code', codes),
    db.from('sales_social_grants').select('id,authorizer_member_id,meta_user_id,status,authorized_at,expires_at,app_id,checked_at,health_error,sales_members(display_name,usuarios!sales_members_user_id_auth_id_fkey(nombre,apellido))')
      .eq('organization_id', actor.organizationId).in('company_code', codes),
  ])
  if (integrations.error || assets.error || grants.error) failure('META_CONNECTION_UNAVAILABLE', 503)
  const accounts = await db.from('sales_social_accounts').select('id,integration_id')
    .eq('organization_id', actor.organizationId).in('integration_id', (integrations.data ?? []).map(row => row.id))
  if (accounts.error) failure('META_CONNECTION_UNAVAILABLE', 503)
  const safeAssets = (assets.data ?? []).map(a => ({ ...a, integrationId: accounts.data?.find(ac => ac.id === a.account_id)?.integration_id }))
  const safeGrants = (grants.data ?? []).map(g => {
    const member = Array.isArray(g.sales_members) ? g.sales_members[0] : g.sales_members
    const user = Array.isArray(member?.usuarios) ? member.usuarios[0] : member?.usuarios
    const { sales_members: _member, ...grant } = g
    return { ...grant, authorizer_name: member?.display_name || [user?.nombre, user?.apellido].filter(Boolean).join(' ') }
  })
  const safeConnections = (integrations.data ?? []).map(i => ({ ...i,
    grant: safeGrants.find(g => g.id === i.grant_id),
    disconnect: prepareMetaDisconnect(safeAssets.filter(a => a.integrationId === i.id).map(a => a.external_asset_id), i.provider_cleanup),
  }))
  return { companies, integrations: safeConnections, assets: safeAssets, canManage, metaAvailable, ingestionEnabled: false }
}
