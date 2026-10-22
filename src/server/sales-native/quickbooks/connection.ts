import 'server-only'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { NativeSalesAuthError, resolveSalesActor } from '@/server/sales-native/auth'
import { patientQboActor } from '@/server/sales-native/patient-qbo-auth'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { QboClient, QBO_CALLBACK } from './client'
import { openQboToken, sealQboToken } from './token-vault'

export const EMC_ORGANIZATION_ID = '9efab353-46a0-43d1-9901-e3f185dc5d30'
const FREDDY_FALLBACK_MEMBER_ID = 'c67e9779-9e87-48b0-9f6c-bf6a0c8cebad'
const statePattern = /^[A-Za-z0-9_-]{40,100}$/

function configuration() {
  const env = process.env
  if (env.LILLY_QBO_OAUTH_ENABLED !== 'true' || !env.LILLY_QBO_CLIENT_ID ||
    !env.LILLY_QBO_CLIENT_SECRET || !env.LILLY_QBO_TOKEN_KEY ||
    env.LILLY_QBO_REDIRECT_URI !== QBO_CALLBACK)
    throw new NativeSalesAuthError(503, 'QBO_OAUTH_NOT_CONFIGURED')
  return { client: new QboClient({ clientId: env.LILLY_QBO_CLIENT_ID,
    clientSecret: env.LILLY_QBO_CLIENT_SECRET, redirectUri: QBO_CALLBACK }),
  key: env.LILLY_QBO_TOKEN_KEY }
}

/** A pending, owner-approved EMC fallback is limited to this QBO connection. */
export async function qboManager(request: Request): Promise<string> {
  const fallback = await patientQboActor(request)
  if (fallback?.memberId === FREDDY_FALLBACK_MEMBER_ID) return fallback.memberId
  const actor = await resolveSalesActor(request)
  if (actor.organizationId !== EMC_ORGANIZATION_ID ||
    !['SUPERADMIN','ADMINISTRATOR'].includes(actor.role))
    throw new NativeSalesAuthError(403, 'QBO_CONNECTION_FORBIDDEN')
  return actor.memberId
}

function stateHash(value: string): string {
  if (!statePattern.test(value)) throw new NativeSalesAuthError(403, 'QBO_OAUTH_STATE_INVALID')
  return createHash('sha256').update(value).digest('hex')
}

export async function beginQboConnection(request: Request): Promise<string> {
  const memberId = await qboManager(request)
  const { client } = configuration()
  const state = randomBytes(32).toString('base64url')
  const { error } = await supabaseAdmin({ noStore: true }).from('sales_qbo_oauth_states')
    .insert({ organization_id: EMC_ORGANIZATION_ID,
      requester_member_id: memberId, state_hash: stateHash(state) })
  if (error) throw new NativeSalesAuthError(503, 'QBO_OAUTH_STATE_UNAVAILABLE')
  return client.authorizationUrl(state)
}

/** Only the same authenticated LILLY manager may consume the one-use state. */
export async function completeQboConnection(request: Request, input: {
  state: string; code: string; realmId: string }): Promise<void> {
  const memberId = await qboManager(request)
  const { client, key } = configuration()
  if (!/^[0-9]{1,80}$/.test(input.realmId))
    throw new NativeSalesAuthError(422, 'QBO_REALM_INVALID')
  const db = supabaseAdmin({ noStore: true })
  const { data: stateId, error: stateError } = await db.rpc('native_sales_qbo_claim_oauth_state', {
    p_state_hash: stateHash(input.state),p_organization_id: EMC_ORGANIZATION_ID,
    p_member_id: memberId,
  })
  if (stateError || !stateId)
    throw new NativeSalesAuthError(403, 'QBO_OAUTH_STATE_INVALID')
  let tokens
  try { tokens = await client.exchange(input.code) }
  catch { throw new NativeSalesAuthError(503, 'QBO_OAUTH_EXCHANGE_FAILED') }
  let company
  try { company = await client.companyInfo(input.realmId, tokens.accessToken) }
  catch { throw new NativeSalesAuthError(503, 'QBO_COMPANY_READ_FAILED') }
  if (![company.name,company.legalName].some(name =>
    name?.trim().toLowerCase() === 'eminat medical center llc'))
    throw new NativeSalesAuthError(422, 'QBO_COMPANY_MISMATCH')
  const { error } = await db.rpc('native_sales_qbo_finish_oauth_state', {
    p_state_id: stateId,p_organization_id: EMC_ORGANIZATION_ID,p_member_id: memberId,
    p_realm_id: input.realmId,
    p_access_ciphertext: sealQboToken(tokens.accessToken,key,EMC_ORGANIZATION_ID,
      input.realmId,'access'),
    p_refresh_ciphertext: sealQboToken(tokens.refreshToken,key,EMC_ORGANIZATION_ID,
      input.realmId,'refresh'),
    p_access_expires_at: tokens.accessExpiresAt.toISOString(),
    p_refresh_expires_at: tokens.refreshExpiresAt.toISOString(),
  })
  if (error) throw new NativeSalesAuthError(503, 'QBO_CONNECTION_UNAVAILABLE')
}

export async function readConnectedQboCompany(): Promise<{
  realmId: string; companyName: string; legalName: string | null }> {
  const { client, key } = configuration()
  const db = supabaseAdmin({ noStore: true })
  const { data: connection, error } = await db.from('sales_qbo_connections')
    .select('realm_id,access_token_ciphertext,access_expires_at,refresh_expires_at,status')
    .eq('organization_id',EMC_ORGANIZATION_ID).eq('environment','production').maybeSingle()
  if (error || !connection || connection.status !== 'CONNECTED' ||
    !connection.access_token_ciphertext || !connection.access_expires_at ||
    !connection.refresh_expires_at)
    throw new NativeSalesAuthError(503, 'QBO_NOT_CONNECTED')
  if (Date.parse(connection.refresh_expires_at) <= Date.now())
    throw new NativeSalesAuthError(503, 'QBO_RECONNECT_REQUIRED')
  const realmId = connection.realm_id
  let accessToken: string
  if (Date.parse(connection.access_expires_at) > Date.now()+60_000) {
    accessToken = openQboToken(connection.access_token_ciphertext,key,
      EMC_ORGANIZATION_ID,realmId,'access')
  } else {
    const claimId = randomUUID()
    const { data: claimed, error: claimError } = await db.rpc('native_sales_qbo_claim_refresh', {
      p_organization_id: EMC_ORGANIZATION_ID,p_claim_id: claimId,
    })
    const lease = Array.isArray(claimed) ? claimed[0] : null
    if (claimError || !lease?.refresh_token_ciphertext || lease.realm_id !== realmId)
      throw new NativeSalesAuthError(503, 'QBO_REFRESH_BUSY')
    const refreshToken = openQboToken(lease.refresh_token_ciphertext,key,
      EMC_ORGANIZATION_ID,realmId,'refresh')
    let refreshed
    try { refreshed = await client.refresh(refreshToken) }
    catch { throw new NativeSalesAuthError(503, 'QBO_REFRESH_FAILED') }
    const { data: saved, error: saveError } = await db.rpc('native_sales_qbo_finish_refresh', {
      p_organization_id: EMC_ORGANIZATION_ID,p_claim_id: claimId,
      p_access_ciphertext: sealQboToken(refreshed.accessToken,key,
        EMC_ORGANIZATION_ID,realmId,'access'),
      p_refresh_ciphertext: sealQboToken(refreshed.refreshToken,key,
        EMC_ORGANIZATION_ID,realmId,'refresh'),
      p_access_expires_at: refreshed.accessExpiresAt.toISOString(),
      p_refresh_expires_at: refreshed.refreshExpiresAt.toISOString(),
    })
    if (saveError || !saved) throw new NativeSalesAuthError(503, 'QBO_REFRESH_SAVE_FAILED')
    accessToken = refreshed.accessToken
  }
  const company = await client.companyInfo(realmId,accessToken)
  if (![company.name,company.legalName].some(name =>
    name?.trim().toLowerCase() === 'eminat medical center llc'))
    throw new NativeSalesAuthError(503, 'QBO_COMPANY_MISMATCH')
  return { realmId,companyName:company.name,legalName:company.legalName }
}

/** Local disconnect invalidates every LILLY-held token and keeps the audit trail. */
export async function disconnectQboConnection(request: Request): Promise<boolean> {
  const memberId = await qboManager(request)
  const { client,key } = configuration()
  const db = supabaseAdmin({ noStore: true })
  const { data: held, error: holdError } = await db.rpc(
    'native_sales_qbo_hold_for_revocation', {
      p_organization_id: EMC_ORGANIZATION_ID,p_member_id: memberId,
    })
  if (holdError)
    throw new NativeSalesAuthError(503,'QBO_DISCONNECT_UNAVAILABLE')
  const connection = Array.isArray(held) ? held[0] : null
  if (!connection) return false
  const refreshToken = openQboToken(connection.refresh_token_ciphertext,key,
    EMC_ORGANIZATION_ID,connection.realm_id,'refresh')
  try { await client.revoke(refreshToken) }
  catch { throw new NativeSalesAuthError(503,'QBO_REVOKE_UNAVAILABLE') }
  const { data, error } = await supabaseAdmin({ noStore: true })
    .rpc('native_sales_qbo_disconnect', {
      p_organization_id: EMC_ORGANIZATION_ID,p_member_id: memberId,
    })
  if (error) throw new NativeSalesAuthError(503, 'QBO_DISCONNECT_UNAVAILABLE')
  return data === true
}
