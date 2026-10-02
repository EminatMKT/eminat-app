import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { clientEnv } from '@/shared/db/env.client'
import { MODULE } from '@/shared/auth/permissions'
import { RPCS, TABLES, TABLE_COLUMNS } from '@/shared/schema'
import MEET_ERRORS from './errors'
import type { MeetError } from './errors/types'

export type MeetActor = { authUserId: string; profileId: string; client: SupabaseClient }
export type AuthResult = { ok: boolean; actor?: MeetActor; status?: number; error?: string }

const AUTHORIZATION_HEADER = 'authorization'
const BEARER_PREFIX = 'Bearer '
const NO_TOKEN = ''
const TASKS_MODULE = { p_slug: MODULE.TASKS }
const { usuarios } = TABLE_COLUMNS
const fail = ({ status, message }: MeetError): AuthResult => {
  const failure: AuthResult = { ok: false, status, error: message }
  return failure
}

export async function requireMeetTaskActor(request: Request): Promise<AuthResult> {
  const authorization = request.headers.get(AUTHORIZATION_HEADER) ?? NO_TOKEN
  const hasBearer = authorization.startsWith(BEARER_PREFIX)
  const token = hasBearer ? authorization.slice(BEARER_PREFIX.length) : NO_TOKEN
  if (!token) return fail(MEET_ERRORS.unauthenticated)
  const client = createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `${BEARER_PREFIX}${token}` } },
  })
  const { data: auth, error: authError } = await client.auth.getUser(token)
  if (authError || !auth.user) return fail(MEET_ERRORS.invalidSession)
  const { data: allowed, error: permissionError } = await client.rpc(RPCS.hasModule, TASKS_MODULE)
  if (permissionError || !allowed) return fail(MEET_ERRORS.missingTasksModule)
  const profileQuery = client.from(TABLES.usuarios).select(usuarios.id).eq(usuarios.authId, auth.user.id)
  const { data: profile, error: profileError } = await profileQuery.eq(usuarios.activo, true).maybeSingle()
  if (profileError || !profile?.id) return fail(MEET_ERRORS.noActiveProfile)
  return { ok: true, actor: { authUserId: auth.user.id, profileId: profile.id, client } }
}
