import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { clientEnv } from '@/shared/db/env.client'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { ADMIN_ROLE, normalizeRole } from '@/shared/auth/permissions'

// Lee la sesión del caller (cookies SSR) y verifica que su rol en DB sea admin.
// Las rutas admin lo usan para cerrar el acceso server-side antes de mutar nada.
//
// Nota: el repo compila con `strict:false`, así que el control-flow narrowing
// sobre uniones discriminadas no funciona (`if (!authz.ok)` no estrecharía la
// rama). Por eso el tipo es un único objeto con `status`/`error`/`userId`
// opcionales: los call sites leen `authz.error`/`authz.status` sin castear.
export type AdminAuth = { ok: boolean; userId?: string; status?: number; error?: string }
export async function requireAdmin(): Promise<AdminAuth> {
  const cookieStore = cookies()
  const ssr = createServerClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { get: (n) => cookieStore.get(n)?.value },
  })
  const { data: { user } } = await ssr.auth.getUser()
  if (!user) return { ok: false, status: 401, error: 'No autenticado.' }
  const { data: row } = await supabaseAdmin().from('usuarios').select('id,rol').eq('auth_id', user.id).maybeSingle()
  if (!row || normalizeRole(row.rol) !== ADMIN_ROLE) return { ok: false, status: 403, error: 'Requiere rol admin.' }
  return { ok: true, userId: row.id }
}
