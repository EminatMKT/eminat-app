import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { clientEnv } from '@/shared/db/env.client'
import type { ModuleSlug } from '@/shared/auth/permissions'

// Guards de las rutas API que NO son de admin.
//
// El matcher de `middleware.ts` excluye `/api` a propósito —una ruta API tiene que poder
// responder 401 en JSON, no redirigir a /login—, así que **cada handler se gatea solo**. Sin
// esto una ruta API queda abierta a internet: fue lo que pasó con /api/mail (19/08/2026).
export type Access = { ok: boolean; userId?: string; status?: number; error?: string }

// Lee la sesión del caller desde las cookies SSR. Con la anon key, no con service_role: la
// gracia es que la query corra COMO el usuario, para que la RLS y auth.uid() lo reconozcan.
export function ssrClient() {
  const cookieStore = cookies()
  return createServerClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: { get: (n: string) => cookieStore.get(n)?.value },
  })
}

export async function requireSession(): Promise<Access> {
  const { data: { user } } = await ssrClient().auth.getUser()
  if (!user) return { ok: false, status: 401, error: 'No autenticado.' }
  return { ok: true, userId: user.id }
}

// Sesión + permiso de módulo. Delega en `has_module(slug)`, la MISMA función de Postgres que
// usan las policies de RLS, así que la ruta no puede desincronizarse de lo que la base permite
// (y hereda el short-circuit de admin, que `is_admin()` ya resuelve adentro).
export async function requireModule(slug: ModuleSlug): Promise<Access> {
  const ssr = ssrClient()
  const { data: { user } } = await ssr.auth.getUser()
  if (!user) return { ok: false, status: 401, error: 'No autenticado.' }
  const { data: allowed } = await ssr.rpc('has_module', { p_slug: slug })
  if (!allowed) return { ok: false, status: 403, error: `Requiere el módulo ${slug}.` }
  return { ok: true, userId: user.id }
}
