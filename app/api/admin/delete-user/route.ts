import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { serverEnv } from '@/lib/env.server'

/**
 * Server-side admin endpoint — hard-deletes a user from BOTH:
 *   • public.usuarios   (the profile row)
 *   • auth.users        (the login identity)
 *
 * Why this exists:
 *   The previous client-side delete called supabase.from('usuarios').delete()
 *   with the user's session JWT. That can be silently rejected by RLS or by
 *   FK constraints, and the previous handler didn't check the error — so the
 *   row "disappeared" from local React state and reappeared on refresh.
 *   This route uses the service_role key to bypass RLS and surfaces every
 *   error to the caller.
 *
 * Foreign-key safety:
 *   If the usuarios row is referenced by another table (notificaciones,
 *   actividades, etc.), the DELETE may fail with Postgres code 23503.
 *   We catch that and return a clear message recommending Deactivate
 *   (UPDATE activo=false) instead, so the caller knows it's a soft-delete
 *   situation rather than a permissions problem.
 *
 * Auth user link:
 *   public.usuarios has both `id` (PK) and `auth_id` (link to auth.users).
 *   Depending on how the row was created, the auth UID lives in `auth_id`
 *   (rows seeded via direct INSERT) OR in `id` (rows created via
 *   /api/admin/create-user, where we set id = authData.user.id). We try
 *   both; if neither matches an actual auth.users row, that's fine —
 *   auth.admin.deleteUser is best-effort and a "not found" is ignored.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY. Never exposed to the browser.
 */
const TAG = '[admin/delete-user]'

export async function POST(req: NextRequest) {
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv
  const { NEXT_PUBLIC_SUPABASE_URL } = env

  const supabaseAdmin = createClient(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  try {
    const body = await req.json()
    const id = typeof body?.id === 'string' ? body.id.trim() : ''
    if (!id) {
      return NextResponse.json({ error: 'id requerido.' }, { status: 400 })
    }

    // 1) Look up the row to find auth_id + email (for logging).
    //    Use maybeSingle so a missing row returns null instead of an error.
    const { data: row, error: lookupError } = await supabaseAdmin
      .from('usuarios')
      .select('id, auth_id, email, nombre, apellido, rol')
      .eq('id', id)
      .maybeSingle()

    if (lookupError) {
      console.error(`${TAG} lookup failed`, { id, error: lookupError.message })
      return NextResponse.json(
        { error: `Lookup falló: ${lookupError.message}` },
        { status: 500 },
      )
    }
    if (!row) {
      console.error(`${TAG} row not found`, { id })
      return NextResponse.json(
        { error: 'Usuario no encontrado en public.usuarios.' },
        { status: 404 },
      )
    }

    console.log(`${TAG} start`, { id, email: row.email, rol: row.rol, hasAuthId: !!row.auth_id })

    // Block deletion of superadmin rows as a guardrail.
    if (row.rol === 'superadmin' || row.rol === 'admin') {
      console.warn(`${TAG} blocked admin-tier delete`, { id, email: row.email, rol: row.rol })
      return NextResponse.json(
        { error: 'No se puede borrar a un usuario con rol admin/superadmin. Cambia su rol primero.' },
        { status: 400 },
      )
    }

    // 2) Best-effort auth.users delete. Try auth_id first (the explicit
    //    link), fall back to id (rows created via /api/admin/create-user
    //    use id = auth_id by construction).
    let authDeleted = false
    let authNote: string | null = null
    const authCandidates = [row.auth_id, row.id].filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    )
    for (const uid of authCandidates) {
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(uid)
      if (!authErr) {
        authDeleted = true
        break
      }
      // "User not found" → try the next candidate; any other error → record
      // it but keep going (we still want to remove the public.usuarios row).
      const msg = authErr.message || ''
      if (!/not.?found/i.test(msg)) {
        authNote = `auth.users delete (id=${uid}) reportó: ${msg}`
      }
    }

    // 3) Public.usuarios delete with service_role (bypasses RLS).
    const { error: dbError, count } = await supabaseAdmin
      .from('usuarios')
      .delete({ count: 'exact' })
      .eq('id', id)

    if (dbError) {
      const isFk = (dbError as any).code === '23503'
      console.error(`${TAG} usuarios delete failed`, { id, code: (dbError as any).code, error: dbError.message, isFk })
      if (isFk) {
        // Count the actividades the user owns so the UI can offer the
        // reassign-and-delete flow with the number up-front.
        const { count: taskCount } = await supabaseAdmin
          .from('actividades')
          .select('id', { count: 'exact', head: true })
          .eq('responsable_id', id)
        return NextResponse.json(
          {
            error:
              'El usuario tiene registros relacionados (actividades, notificaciones u otros). Usa "Heredar y borrar" para transferir sus tareas a otro miembro, o "Deactivate" para preservar el historial intacto.',
            dbErrorCode: (dbError as any).code,
            blockedBy: 'foreign_key',
            taskCount: taskCount ?? 0,
            authDeleted,
            authNote,
          },
          { status: 409 },
        )
      }
      return NextResponse.json(
        { error: `DB delete falló: ${dbError.message}`, dbErrorCode: (dbError as any).code, authDeleted, authNote },
        { status: 500 },
      )
    }

    if (!count) {
      console.warn(`${TAG} 0 rows affected`, { id })
      return NextResponse.json(
        { error: 'La fila no se borró (0 filas afectadas). Puede que ya no exista.', authDeleted, authNote },
        { status: 404 },
      )
    }

    console.log(`${TAG} success`, { id, email: row.email, authDeleted, authNote })
    return NextResponse.json({
      ok: true,
      dbDeleted: true,
      authDeleted,
      authNote,
      removed: { id: row.id, email: row.email, nombre: row.nombre, apellido: row.apellido },
    })
  } catch (err: any) {
    console.error(`${TAG} unexpected`, { message: err?.message })
    return NextResponse.json(
      { error: err?.message || 'Error inesperado al borrar el usuario.' },
      { status: 500 },
    )
  }
}
