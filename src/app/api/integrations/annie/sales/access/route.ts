import { createClient } from '@supabase/supabase-js'
import { clientEnv } from '@/shared/db/env.client'
import { salesQaAllowed } from '@/server/integrations/annie/qa-gate'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authorization = request.headers.get('authorization') ?? ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) return Response.json({ allowed: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  const client = createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: auth, error } = await client.auth.getUser(token)
  if (error || !auth.user) return Response.json({ allowed: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  const { data: profile, error: profileError } = await client.from('usuarios')
    .select('id').eq('auth_id', auth.user.id).eq('activo', true).maybeSingle()
  return Response.json({ allowed: !profileError && !!profile?.id && salesQaAllowed(profile.id, auth.user.id) },
    { headers: { 'Cache-Control': 'no-store' } })
}
