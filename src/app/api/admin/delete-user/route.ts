import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { requireAdmin } from '@/shared/db/requireAdmin'
import { isLastAdmin } from '@/shared/auth/roleValidation'

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
 * Requires SUPABASE_SECRET_KEY. Never exposed to the browser.
 */
const TAG = '[admin/delete-user]'

export async function POST(req: NextRequest) {
  const authz = await requireAdmin()
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const db = supabaseAdmin()

  try {
    const body = await req.json()
    const id = typeof body?.id === 'string' ? body.id.trim() : ''
    if (!id) {
      return NextResponse.json({ error: 'id requerido.' }, { status: 400 })
    }

    // 1) Look up the row to find auth_id + email (for logging).
    //    Use maybeSingle so a missing row returns null instead of an error.
    const { data: row, error: lookupError } = await db
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

    // Guard: nunca borrar al último admin (defensa en profundidad; el bloqueo
    // admin-tier de arriba ya lo cubre, pero esto sobrevive si ese cambia).
    const { data: all } = await db.from('usuarios').select('id,rol')
    if (isLastAdmin(all || [], id)) {
      return NextResponse.json(
        { error: 'No se puede borrar al último admin.' },
        { status: 400 },
      )
    }

    // 2) Public.usuarios delete PRIMERO, con service_role (bypasea RLS).
    //    EL ORDEN IMPORTA: si esto va después del borrado de Auth, un DELETE
    //    frenado por una FK —el caso normal de cualquiera con actividades—
    //    deja a la persona con su fila intacta pero SIN cuenta, sin poder
    //    entrar nunca más, y el admin solo ve un mensaje de error. Borrando
    //    la fila primero, la FK aborta sin haber destruido nada.
    //    Cubre TODA fuente de FK (actividades, notificaciones, historial…),
    //    no solo las que sepamos enumerar acá.
    const { error: dbError, count } = await db
      .from('usuarios')
      .delete({ count: 'exact' })
      .eq('id', id)

    if (dbError) {
      const dbErrorCode = (dbError as { code?: string }).code
      const isFk = dbErrorCode === '23503'
      console.error(`${TAG} usuarios delete failed — auth INTACTO`, { id, code: dbErrorCode, error: dbError.message, isFk })
      if (isFk) {
        // Count the actividades the user owns so the UI can offer the
        // reassign-and-delete flow with the number up-front.
        const { count: taskCount } = await db
          .from('actividades')
          .select('id', { count: 'exact', head: true })
          .eq('responsable_id', id)
        // Lo SOLICITADO va aparte y no se hereda: `admin_reassign_and_delete`
        // pone `solicitante_id = NULL`. Se cuenta igual porque sin esto el modal
        // afirma "no tiene tareas asignadas" a quien pidió tareas, y el admin no
        // se entera de que va a perder el dato de quién las pidió.
        const { count: requestedCount } = await db
          .from('actividades')
          .select('id', { count: 'exact', head: true })
          .eq('solicitante_id', id)
        return NextResponse.json(
          {
            error:
              'El usuario tiene registros relacionados (actividades, notificaciones u otros). Usa "Heredar y borrar" para transferir sus tareas a otro miembro, o "Deactivate" para preservar el historial intacto.',
            dbErrorCode,
            blockedBy: 'foreign_key',
            taskCount: taskCount ?? 0,
            requestedCount: requestedCount ?? 0,
            authDeleted: false,
            authNote: null,
          },
          { status: 409 },
        )
      }
      return NextResponse.json(
        { error: `DB delete falló: ${dbError.message}`, dbErrorCode, authDeleted: false, authNote: null },
        { status: 500 },
      )
    }

    if (!count) {
      console.warn(`${TAG} 0 rows affected — auth INTACTO`, { id })
      return NextResponse.json(
        { error: 'La fila no se borró (0 filas afectadas). Puede que ya no exista.', authDeleted: false, authNote: null },
        { status: 404 },
      )
    }

    // 3) Recién ahora, el auth.users. Best-effort: la fila ya no está, así que
    //    fallar acá deja una cuenta huérfana (puede autenticarse pero se queda
    //    sin perfil y la app la desloguea) — molesto y reparable a mano, muy
    //    lejos del daño de perder el acceso con la fila viva.
    //    Prueba auth_id primero (el vínculo explícito) y cae a id (las filas
    //    creadas por /api/admin/create-user usan id = auth_id por construcción).
    let authDeleted = false
    let authNote: string | null = null
    const authCandidates = [row.auth_id, row.id].filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    )
    for (const uid of authCandidates) {
      const { error: authErr } = await db.auth.admin.deleteUser(uid)
      if (!authErr) {
        authDeleted = true
        break
      }
      // "User not found" → probar el siguiente candidato; cualquier otro error
      // se registra para que el admin sepa que quedó una cuenta huérfana.
      const msg = authErr.message || ''
      if (!/not.?found/i.test(msg)) {
        authNote = `auth.users delete (id=${uid}) reportó: ${msg}`
      }
    }

    console.log(`${TAG} success`, { id, email: row.email, authDeleted, authNote })
    return NextResponse.json({
      ok: true,
      dbDeleted: true,
      authDeleted,
      authNote,
      removed: { id: row.id, email: row.email, nombre: row.nombre, apellido: row.apellido },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ''
    console.error(`${TAG} unexpected`, { message })
    return NextResponse.json(
      { error: message || 'Error inesperado al borrar el usuario.' },
      { status: 500 },
    )
  }
}
