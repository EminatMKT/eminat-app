import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { clientEnv } from '@/shared/db/env.client'

export type MeetActor = { authUserId: string; profileId: string; client: SupabaseClient }
export type AuthResult = { ok: boolean; actor?: MeetActor; status?: 401 | 403; error?: string }

export async function requireMeetTaskActor(request: Request): Promise<AuthResult> {
  const authorization = request.headers.get('authorization') ?? ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) return { ok: false, status: 401, error: 'No autenticado.' }
  const client = createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: auth, error: authError } = await client.auth.getUser(token)
  if (authError || !auth.user) return { ok: false, status: 401, error: 'Sesión inválida.' }
  const { data: allowed, error: permissionError } = await client.rpc('has_module', { p_slug: 'tasks' })
  if (permissionError || !allowed) return { ok: false, status: 403, error: 'Requiere el módulo tasks.' }
  const { data: profile, error: profileError } = await client.from('usuarios').select('id').eq('auth_id', auth.user.id).eq('activo', true).maybeSingle()
  if (profileError || !profile?.id) return { ok: false, status: 403, error: 'El usuario autenticado no tiene un perfil activo.' }
  return { ok: true, actor: { authUserId: auth.user.id, profileId: profile.id, client } }
}
