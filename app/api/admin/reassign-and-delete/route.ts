import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { clientEnv } from '@/shared/db/env.client'
import { serverEnv } from '@/shared/db/env.server'

/**
 * Server-side admin endpoint — reassign all of a user's actividades to a
 * new owner and then delete the user, atomically.
 *
 * Calls the Postgres function public.admin_reassign_and_delete(...) via
 * supabase.rpc(). That function does all of the public.* mutations in a
 * single transaction (rolls back as a whole if anything fails). After
 * the RPC succeeds, this route best-effort deletes the matching
 * auth.users row (GoTrue is not part of the public schema and can't
 * participate in the SQL transaction — worst case is an orphan auth row
 * that can be removed manually from the Supabase Dashboard).
 *
 * Request body:
 *   {
 *     oldId: string            // usuarios.id of the user to remove
 *     newId: string            // usuarios.id of the heir
 *     newRef: string           // heir's usuarios.responsable_ref (parallel text label)
 *     statusOverride?: 'aprobado' | 'finalizado' | 'por_aprobar' | null
 *   }
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY. Never exposed to the browser.
 */

const TAG = '[admin/reassign-and-delete]'
const VALID_STATUS = new Set([null, undefined, 'aprobado', 'finalizado', 'por_aprobar'])

export async function POST(req: NextRequest) {
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv
  const { NEXT_PUBLIC_SUPABASE_URL } = clientEnv

  const supabaseAdmin = createClient(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  try {
    const body = await req.json()
    const { oldId, newId, newRef, statusOverride } = body as {
      oldId?: string; newId?: string; newRef?: string; statusOverride?: string | null
    }

    if (!oldId || !newId || !newRef) {
      return NextResponse.json(
        { error: 'oldId, newId y newRef son requeridos.' },
        { status: 400 },
      )
    }
    if (oldId === newId) {
      return NextResponse.json(
        { error: 'El nuevo dueño no puede ser el mismo usuario que se borra.' },
        { status: 400 },
      )
    }
    if (!VALID_STATUS.has(statusOverride ?? null)) {
      return NextResponse.json(
        { error: `statusOverride inválido: ${statusOverride}` },
        { status: 400 },
      )
    }

    console.log(`${TAG} start`, { oldId, newId, newRef, statusOverride: statusOverride ?? null })

    // Lookup old user to (a) refuse admin-tier deletes and (b) capture
    // auth_id / id so we can clean up auth.users after the RPC.
    const { data: oldRow, error: lookupError } = await supabaseAdmin
      .from('usuarios')
      .select('id, auth_id, email, nombre, apellido, rol')
      .eq('id', oldId)
      .maybeSingle()

    if (lookupError) {
      console.error(`${TAG} lookup failed`, { oldId, error: lookupError.message })
      return NextResponse.json({ error: `Lookup falló: ${lookupError.message}` }, { status: 500 })
    }
    if (!oldRow) {
      return NextResponse.json({ error: 'Usuario no encontrado en public.usuarios.' }, { status: 404 })
    }
    if (oldRow.rol === 'admin' || oldRow.rol === 'superadmin') {
      console.warn(`${TAG} blocked admin-tier delete`, { oldId, rol: oldRow.rol })
      return NextResponse.json(
        { error: 'No se puede borrar a un usuario con rol admin/superadmin. Cambia su rol primero.' },
        { status: 400 },
      )
    }

    // Atomic reassign + cleanup + delete inside Postgres.
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
      'admin_reassign_and_delete',
      {
        p_old_id: oldId,
        p_new_id: newId,
        p_new_ref: newRef,
        p_status_override: statusOverride ?? null,
      },
    )

    if (rpcError) {
      console.error(`${TAG} RPC failed`, {
        oldId, newId,
        error: rpcError.message,
        code: (rpcError as any).code,
      })
      return NextResponse.json(
        { error: rpcError.message || 'La herencia atómica falló.', dbErrorCode: (rpcError as any).code },
        { status: 500 },
      )
    }

    console.log(`${TAG} RPC ok`, { oldId, result: rpcData })

    // Best-effort auth.users delete. Not part of the SQL transaction —
    // if it fails, the public side is already consistent and we surface
    // a note so the admin can remove the orphan from the dashboard.
    let authDeleted = false
    let authNote: string | null = null
    const authCandidates = [oldRow.auth_id, oldRow.id].filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    )
    for (const uid of authCandidates) {
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(uid)
      if (!authErr) {
        authDeleted = true
        break
      }
      if (!/not.?found/i.test(authErr.message || '')) {
        authNote = `auth.users delete (id=${uid}) reportó: ${authErr.message}`
        console.warn(`${TAG} auth delete error (continuing)`, { uid, error: authErr.message })
      }
    }

    console.log(`${TAG} success`, {
      oldId,
      transferred: (rpcData as any)?.transferred,
      authDeleted,
    })

    return NextResponse.json({
      ok: true,
      transferred:    (rpcData as any)?.transferred    ?? 0,
      notifsDeleted:  (rpcData as any)?.notifs_deleted ?? 0,
      oldUser:        { id: oldRow.id, email: oldRow.email, nombre: oldRow.nombre, apellido: oldRow.apellido },
      authDeleted,
      authNote,
    })
  } catch (err: any) {
    console.error(`${TAG} unexpected`, { message: err?.message })
    return NextResponse.json(
      { error: err?.message || 'Error inesperado en la herencia.' },
      { status: 500 },
    )
  }
}
