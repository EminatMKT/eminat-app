import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { requireAdmin } from '@/shared/db/requireAdmin'

/**
 * Server-side admin endpoint — rotates a user's auth password to a new
 * value provided by the admin (or generated client-side and POSTed here).
 * Returns success only; the password is what the admin already had in
 * hand, so we don't echo it back. The admin shares it with the user.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY. Never exposed to the browser.
 */
const TAG = '[admin/reset-password]'

export async function POST(req: NextRequest) {
  const authz = await requireAdmin()
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const db = supabaseAdmin()

  try {
    const { userId, password } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId requerido.' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres.' },
        { status: 400 },
      )
    }

    console.log(`${TAG} start`, { userId })

    // El frontend manda usuarios.id. El auth id real puede estar en la columna
    // auth_id (filas sembradas) o ser el propio id (filas creadas por la app, que
    // usan id = auth_id). Resolvemos la fila y probamos ambos candidatos —mismo
    // patrón robusto que delete-user— en vez de asumir id === auth id.
    const { data: row } = await db
      .from('usuarios')
      .select('id, auth_id')
      .eq('id', userId)
      .maybeSingle()
    if (!row) {
      return NextResponse.json({ error: 'Usuario no encontrado en public.usuarios.' }, { status: 404 })
    }
    const authCandidates = [row.auth_id, row.id].filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    )

    let lastError: string | null = null
    for (const uid of authCandidates) {
      const { data, error } = await db.auth.admin.updateUserById(uid, { password })
      if (!error && data?.user) {
        console.log(`${TAG} success`, { userId, authId: uid })
        return NextResponse.json({ ok: true })
      }
      lastError = error?.message || 'No se pudo actualizar la contraseña.'
      if (!/not.?found/i.test(lastError)) break // error real (no "user not found") → no seguir probando
    }

    console.error(`${TAG} auth.updateUserById failed`, { userId, error: lastError })
    return NextResponse.json({ error: lastError || 'No se pudo actualizar la contraseña.' }, { status: 400 })
  } catch (err: any) {
    console.error(`${TAG} unexpected`, { message: err?.message })
    return NextResponse.json(
      { error: err?.message || 'Error inesperado al resetear la contraseña.' },
      { status: 500 },
    )
  }
}
