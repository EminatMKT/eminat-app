import 'server-only'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { NativeSalesAuthError, resolveSalesActor } from '@/server/sales-native/auth'
import { salesCan, type SalesActor } from '@/server/sales-native/policy'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { MetaGraphClient, META_OAUTH_SCOPES, type MetaGraphPage } from './meta-graph'
import { openSocialToken, sealSocialToken } from './token-vault'

const statePattern = /^[A-Za-z0-9_-]{40,100}$/
const scopes = z.array(z.enum(['pages_messaging', 'pages_read_user_content',
  'instagram_basic', 'instagram_manage_messages', 'instagram_manage_comments'])).max(5)
const pageSelection = z.object({ state: z.string().regex(statePattern),
  pageId: z.string().min(1).max(200) }).strict()
const subscription = z.object({ assetId: z.uuid() }).strict()
const revocation = z.object({ integrationId: z.uuid() }).strict()

function hash(state: string): string {
  if (!statePattern.test(state)) throw new NativeSalesAuthError(422, 'META_STATE_INVALID')
  return createHash('sha256').update(state).digest('hex')
}

function configuration() {
  const env = process.env
  if (env.LILLY_META_OAUTH_ENABLED !== 'true' || !env.LILLY_META_APP_ID ||
    !env.LILLY_META_APP_SECRET || !env.LILLY_META_GRAPH_VERSION ||
    !env.LILLY_SOCIAL_TOKEN_KEY)
    throw new NativeSalesAuthError(503, 'META_NOT_CONFIGURED')
  const client = new MetaGraphClient({ appId: env.LILLY_META_APP_ID,
    appSecret: env.LILLY_META_APP_SECRET, version: env.LILLY_META_GRAPH_VERSION,
    callback: 'https://app.stratixsolutions.us/api/sales-native/social/meta/callback' })
  return { client, key: env.LILLY_SOCIAL_TOKEN_KEY }
}

function requireManager(actor: SalesActor) {
  if (!salesCan(actor, 'sales:social:manage'))
    throw new NativeSalesAuthError(403, 'SALES_ACCESS_DENIED')
}

export async function cleanupExpiredMetaGrants() {
  const { error } = await supabaseAdmin({ noStore: true }).from('sales_social_oauth_states')
    .update({ grant_ciphertext: null, pages_ciphertext: null })
    .lt('expires_at', new Date().toISOString())
    .neq('status', 'CONSUMED')
  if (error) throw new NativeSalesAuthError(503, 'META_STATE_UNAVAILABLE')
}

export async function beginMetaConnection(actor: SalesActor, input: {
  ownerMemberId: string; teamId?: string | null; extraScopes?: string[] }) {
  requireManager(actor)
  const parsed = z.object({ ownerMemberId: z.uuid(), teamId: z.uuid().nullable().optional(),
    extraScopes: scopes.optional() }).strict().safeParse(input)
  if (!parsed.success) throw new NativeSalesAuthError(422, 'META_CONNECTION_INVALID')
  const { client } = configuration()
  const db = supabaseAdmin({ noStore: true })
  // Expired handoffs must not retain encrypted provider credentials indefinitely.
  await cleanupExpiredMetaGrants()
  const { data: provider, error: providerError } = await db.from('sales_social_providers')
    .select('enabled').eq('code', 'META').maybeSingle()
  if (providerError || !provider?.enabled) throw new NativeSalesAuthError(503, 'META_PROVIDER_DISABLED')
  const { data: owner, error: ownerError } = await db.from('sales_members')
    .select('id').eq('organization_id', actor.organizationId)
    .eq('id', parsed.data.ownerMemberId).eq('status', 'active').maybeSingle()
  if (ownerError || !owner) throw new NativeSalesAuthError(422, 'META_OWNER_UNAVAILABLE')
  if (parsed.data.teamId) {
    const { data: team, error: teamError } = await db.from('sales_teams')
      .select('id').eq('organization_id', actor.organizationId)
      .eq('id', parsed.data.teamId).maybeSingle()
    if (teamError || !team) throw new NativeSalesAuthError(422, 'META_TEAM_UNAVAILABLE')
  }
  const state = randomBytes(32).toString('base64url')
  const requested = [...META_OAUTH_SCOPES, ...(parsed.data.extraScopes ?? [])]
  const { error } = await db.from('sales_social_oauth_states').insert({
    organization_id: actor.organizationId, requester_member_id: actor.memberId,
    default_owner_member_id: parsed.data.ownerMemberId,
    default_team_id: parsed.data.teamId ?? null,
    state_hash: hash(state), requested_scopes: requested,
  })
  if (error) throw new NativeSalesAuthError(503, 'META_STATE_UNAVAILABLE')
  return { url: client.authorizationUrl(state, parsed.data.extraScopes), state }
}

async function authorizedState(state: string, actor: SalesActor, status: 'PENDING' | 'EXCHANGED') {
  requireManager(actor)
  const { data, error } = await supabaseAdmin({ noStore: true }).from('sales_social_oauth_states')
    .select('id,organization_id,requester_member_id,status,expires_at,grant_ciphertext,pages_ciphertext,grant_expires_at,granted_scopes')
    .eq('state_hash', hash(state)).maybeSingle()
  if (error || !data || data.organization_id !== actor.organizationId ||
    data.requester_member_id !== actor.memberId || data.status !== status ||
    Date.parse(data.expires_at) <= Date.now())
    throw new NativeSalesAuthError(403, 'META_GRANT_UNAVAILABLE')
  return data
}

/** Callback requires the same LILLY browser identity that began the grant. */
export async function exchangeMetaConnection(state: string, code: string, accessToken: string) {
  const db = supabaseAdmin({ noStore: true })
  const pending = await db.from('sales_social_oauth_states')
    .select('organization_id').eq('state_hash', hash(state)).maybeSingle()
  if (pending.error || !pending.data)
    throw new NativeSalesAuthError(403, 'META_GRANT_UNAVAILABLE')
  const request = new Request('https://app.stratixsolutions.us/api/sales-native/social/meta/callback', {
    headers: { Authorization: `Bearer ${accessToken}`,
      'X-Sales-Organization-Id': pending.data.organization_id },
  })
  const actor = await resolveSalesActor(request)
  const row = await authorizedState(state, actor, 'PENDING')
  const { client, key } = configuration()
  const grant = await client.exchange(code)
  const [pages, granted] = await Promise.all([
    client.discoverPages(grant.token), client.grantedPermissions(grant.token),
  ])
  if (!granted.includes('pages_show_list') || !pages.length)
    throw new NativeSalesAuthError(409, 'META_PAGES_UNAVAILABLE')
  const sealedGrant = sealSocialToken(grant.token, key, actor.organizationId, row.id)
  const sealedPages = sealSocialToken(JSON.stringify(pages), key, actor.organizationId, row.id)
  const { data: updated, error } = await db.from('sales_social_oauth_states')
    .update({ status: 'EXCHANGED', grant_ciphertext: sealedGrant,
      pages_ciphertext: sealedPages, grant_expires_at: grant.expiresAt.toISOString(),
      granted_scopes: granted, exchanged_at: new Date().toISOString() })
    .eq('id', row.id).eq('status', 'PENDING').gt('expires_at', new Date().toISOString())
    .select('id').maybeSingle()
  if (error || !updated) throw new NativeSalesAuthError(409, 'META_GRANT_USED')
  return { state }
}

export async function listMetaGrantPages(actor: SalesActor, state: string) {
  const row = await authorizedState(state, actor, 'EXCHANGED')
  const { key } = configuration()
  if (!row.pages_ciphertext) throw new NativeSalesAuthError(403, 'META_GRANT_UNAVAILABLE')
  let decoded: unknown
  try { decoded = JSON.parse(openSocialToken(row.pages_ciphertext, key, actor.organizationId, row.id)) }
  catch { throw new NativeSalesAuthError(503, 'META_GRANT_INVALID') }
  const parsed = z.array(z.object({ id: z.string(), name: z.string(), tasks: z.array(z.string()).optional(),
    business: z.object({ id: z.string(), name: z.string().optional() }).optional(),
    instagram_business_account: z.object({ id: z.string() }).optional(),
    access_token: z.string() })).safeParse(decoded)
  if (!parsed.success) throw new NativeSalesAuthError(503, 'META_GRANT_INVALID')
  return parsed.data.map(page => ({ id: page.id, name: page.name, tasks: page.tasks ?? [],
    business: page.business ?? null, instagramAccountId: page.instagram_business_account?.id ?? null }))
}

export async function completeMetaConnection(actor: SalesActor, input: unknown) {
  requireManager(actor)
  const parsed = pageSelection.safeParse(input)
  if (!parsed.success) throw new NativeSalesAuthError(422, 'META_PAGE_INVALID')
  const row = await authorizedState(parsed.data.state, actor, 'EXCHANGED')
  if (!row.grant_ciphertext || !row.pages_ciphertext || !row.grant_expires_at ||
    Date.parse(row.grant_expires_at) <= Date.now())
    throw new NativeSalesAuthError(403, 'META_GRANT_UNAVAILABLE')
  const { key } = configuration()
  let pages: MetaGraphPage[]
  try { pages = z.array(z.object({ id: z.string(), name: z.string(),
    access_token: z.string(), tasks: z.array(z.string()).optional(),
    business: z.object({ id: z.string(), name: z.string().optional() }).optional(),
    instagram_business_account: z.object({ id: z.string() }).optional(),
  })).parse(JSON.parse(openSocialToken(row.pages_ciphertext, key,
    actor.organizationId, row.id))) }
  catch { throw new NativeSalesAuthError(503, 'META_GRANT_INVALID') }
  const page = pages.find(item => item.id === parsed.data.pageId)
  if (!page?.access_token) throw new NativeSalesAuthError(422, 'META_PAGE_INVALID')
  const integrationId = randomUUID()
  const userToken = openSocialToken(row.grant_ciphertext, key, actor.organizationId, row.id)
  const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_complete_meta_page', {
    p_state_id: row.id, p_organization_id: actor.organizationId,
    p_actor_member_id: actor.memberId, p_integration_id: integrationId,
    p_page_id: page.id, p_page_name: page.name,
    p_business_id: page.business?.id ?? null, p_business_name: page.business?.name ?? null,
    p_instagram_id: page.instagram_business_account?.id ?? null,
    p_user_token_ciphertext: sealSocialToken(userToken, key, actor.organizationId, integrationId),
    p_page_token_ciphertext: sealSocialToken(page.access_token, key,
      actor.organizationId, integrationId),
    p_user_expires_at: row.grant_expires_at,
  })
  if (error || !data || typeof data !== 'object')
    throw new NativeSalesAuthError(503, 'META_CONNECTION_UNAVAILABLE')
  return data
}

/** Subscribe only a Page owned by this tenant after checking the granted scope. */
export async function subscribeMetaLeadgen(actor: SalesActor, input: unknown) {
  requireManager(actor)
  const parsed = subscription.safeParse(input)
  if (!parsed.success) throw new NativeSalesAuthError(422, 'META_ASSET_INVALID')
  if (!process.env.LILLY_META_VERIFY_TOKEN || process.env.LILLY_META_VERIFY_TOKEN.length < 16)
    throw new NativeSalesAuthError(503, 'META_WEBHOOK_NOT_CONFIGURED')
  const { client, key } = configuration()
  const db = supabaseAdmin({ noStore: true })
  const { data: asset, error: assetError } = await db.from('sales_social_assets')
    .select('id,organization_id,account_id,external_asset_id,asset_type,status,token_ciphertext,token_expires_at')
    .eq('organization_id', actor.organizationId).eq('id', parsed.data.assetId).maybeSingle()
  if (assetError || !asset || asset.asset_type !== 'page' ||
    !['READY', 'SUBSCRIBED'].includes(asset.status) || !asset.token_ciphertext ||
    !asset.token_expires_at || Date.parse(asset.token_expires_at) <= Date.now())
    throw new NativeSalesAuthError(409, 'META_ASSET_UNAVAILABLE')
  const { data: account, error: accountError } = await db.from('sales_social_accounts')
    .select('integration_id').eq('organization_id', actor.organizationId)
    .eq('id', asset.account_id).maybeSingle()
  if (accountError || !account) throw new NativeSalesAuthError(409, 'META_ASSET_UNAVAILABLE')
  const { data: integration, error: integrationError } = await db.from('sales_social_integrations')
    .select('id,status,granted_permissions').eq('organization_id', actor.organizationId)
    .eq('id', account.integration_id).eq('provider_code', 'META').maybeSingle()
  if (integrationError || !integration || integration.status !== 'CONNECTED' ||
    !Array.isArray(integration.granted_permissions) ||
    !['pages_manage_metadata', 'leads_retrieval'].every(scope =>
      integration.granted_permissions.includes(scope)))
    throw new NativeSalesAuthError(409, 'META_PERMISSION_UNAVAILABLE')
  const pageToken = openSocialToken(asset.token_ciphertext, key,
    actor.organizationId, integration.id)
  await client.subscribePage(asset.external_asset_id, pageToken, ['leadgen'])
  const { data: updated, error: updateError } = await db.rpc('native_sales_mark_meta_page_subscribed', {
    p_organization_id: actor.organizationId, p_actor_member_id: actor.memberId,
    p_asset_id: asset.id,
  })
  if (updateError || !updated) throw new NativeSalesAuthError(503, 'META_SUBSCRIPTION_STATE_UNAVAILABLE')
  return updated
}

export async function revokeMetaConnection(actor: SalesActor, input: unknown) {
  requireManager(actor)
  const parsed = revocation.safeParse(input)
  if (!parsed.success) throw new NativeSalesAuthError(422, 'META_CONNECTION_INVALID')
  const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_revoke_meta_connection', {
    p_organization_id: actor.organizationId, p_actor_member_id: actor.memberId,
    p_integration_id: parsed.data.integrationId,
  })
  if (error || !data) throw new NativeSalesAuthError(409, 'META_CONNECTION_UNAVAILABLE')
  return data
}

export async function refreshMetaConnection(actor: SalesActor, input: unknown) {
  requireManager(actor)
  const parsed = revocation.safeParse(input)
  if (!parsed.success) throw new NativeSalesAuthError(422, 'META_CONNECTION_INVALID')
  const { client, key } = configuration()
  const db = supabaseAdmin({ noStore: true })
  const { data: integration, error: integrationError } = await db.from('sales_social_integrations')
    .select('id,status,token_ciphertext,token_expires_at')
    .eq('organization_id', actor.organizationId).eq('id', parsed.data.integrationId)
    .eq('provider_code', 'META').maybeSingle()
  if (integrationError || !integration || !['CONNECTED', 'DEGRADED'].includes(integration.status) ||
    !integration.token_ciphertext || !integration.token_expires_at ||
    Date.parse(integration.token_expires_at) <= Date.now())
    throw new NativeSalesAuthError(409, 'META_RECONNECT_REQUIRED')
  const { data: accounts, error: accountError } = await db.from('sales_social_accounts')
    .select('id').eq('organization_id', actor.organizationId)
    .eq('integration_id', integration.id).limit(2)
  if (accountError || accounts?.length !== 1)
    throw new NativeSalesAuthError(409, 'META_CONNECTION_UNAVAILABLE')
  const { data: assets, error: assetError } = await db.from('sales_social_assets')
    .select('id,external_asset_id').eq('organization_id', actor.organizationId)
    .eq('account_id', accounts[0].id).eq('asset_type', 'page').limit(2)
  if (assetError || assets?.length !== 1)
    throw new NativeSalesAuthError(409, 'META_CONNECTION_UNAVAILABLE')
  const oldToken = openSocialToken(integration.token_ciphertext, key,
    actor.organizationId, integration.id)
  const grant = await client.refreshUserToken(oldToken)
  const [pages, permissions] = await Promise.all([
    client.discoverPages(grant.token), client.grantedPermissions(grant.token),
  ])
  if (!META_OAUTH_SCOPES.every(scope => permissions.includes(scope)))
    throw new NativeSalesAuthError(409, 'META_PERMISSION_UNAVAILABLE')
  const page = pages.find(item => item.id === assets[0].external_asset_id)
  if (!page) throw new NativeSalesAuthError(409, 'META_PAGE_UNAVAILABLE')
  const { data, error } = await db.rpc('native_sales_refresh_meta_connection', {
    p_organization_id: actor.organizationId, p_actor_member_id: actor.memberId,
    p_integration_id: integration.id, p_page_id: page.id,
    p_user_token_ciphertext: sealSocialToken(grant.token, key,
      actor.organizationId, integration.id),
    p_page_token_ciphertext: sealSocialToken(page.access_token, key,
      actor.organizationId, integration.id),
    p_expires_at: grant.expiresAt.toISOString(), p_granted_permissions: permissions,
  })
  if (error || !data) throw new NativeSalesAuthError(503, 'META_REFRESH_UNAVAILABLE')
  return data
}
