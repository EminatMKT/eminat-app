import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { serverEnv } from '@/lib/env.server'

/**
 * Server-side admin endpoint — partial user update.
 *
 * Only `id` is required. Every other field is optional; we only touch the
 * columns that were actually included in the request body. This lets the
 * same endpoint handle:
 *   • A full Edit-user save (email, nombre, apellido, rol, tipo, color,
 *     ubicacion, empresa, cargo all set)
 *   • A toggle Activate / Deactivate ({ id, activo })
 *   • A "Validate" action ({ id, validado: true, activo: true })
 *   • A standalone role change ({ id, rol })
 *
 * Atomic email change:
 *   If `email` is being changed (caller passes both `currentEmail` and a
 *   different `email`), we update auth.users.email FIRST. If the
 *   subsequent usuarios update fails, we revert auth.users.email back so
 *   the two never drift apart.
 *
 * Service-role only. Bypasses RLS. SUPABASE_SERVICE_ROLE_KEY is never
 * exposed to the browser.
 */

const TAG = '[admin/update-user]'

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
    const {
      id,
      currentEmail,
      email,
      nombre,
      apellido,
      rol,
      tipo,
      color,
      ubicacion,
      empresa,
      cargo,
      activo,
      validado,
    } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id requerido.' }, { status: 400 })
    }

    // Only include keys that were explicitly sent. undefined → skip.
    const updatePayload: Record<string, unknown> = {}
    if (email !== undefined) updatePayload.email = email
    if (nombre !== undefined) updatePayload.nombre = nombre
    if (apellido !== undefined) updatePayload.apellido = apellido
    if (rol !== undefined) updatePayload.rol = rol
    if (tipo !== undefined) updatePayload.tipo = tipo
    if (color !== undefined) updatePayload.color = color
    if (ubicacion !== undefined) updatePayload.ubicacion = ubicacion
    if (empresa !== undefined) updatePayload.empresa = empresa
    if (cargo !== undefined) updatePayload.cargo = cargo
    if (activo !== undefined) updatePayload.activo = activo
    if (validado !== undefined) updatePayload.validado = validado

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Sin campos para actualizar.' }, { status: 400 })
    }

    console.log(`${TAG} start`, { id, fields: Object.keys(updatePayload) })

    const emailChanged =
      typeof email === 'string' &&
      typeof currentEmail === 'string' &&
      currentEmail.toLowerCase().trim() !== email.toLowerCase().trim()

    // 1) Update Auth email if (and only if) the request is changing email
    //    and both old + new were provided.
    if (emailChanged) {
      console.log(`${TAG} auth email change`, { id, from: currentEmail, to: email })
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        email,
        email_confirm: true,
      })
      if (authError) {
        console.error(`${TAG} auth email update failed`, { id, error: authError.message })
        return NextResponse.json({ error: `Auth: ${authError.message}` }, { status: 400 })
      }
    }

    // 2) Update usuarios. count:'exact' lets us detect "0 rows affected"
    //    (which would mean no row with that id exists).
    const { data: userData, error: dbError, count } = await supabaseAdmin
      .from('usuarios')
      .update(updatePayload, { count: 'exact' })
      .eq('id', id)
      .select()
      .single()

    if (dbError) {
      console.error(`${TAG} usuarios update failed`, {
        id,
        error: dbError.message,
        code: (dbError as any).code,
        fields: Object.keys(updatePayload),
      })
      // Revert Auth email if we touched it earlier.
      if (emailChanged) {
        const { error: revertError } = await supabaseAdmin.auth.admin.updateUserById(id, {
          email: currentEmail,
          email_confirm: true,
        })
        const tail = revertError
          ? ` (no se pudo revertir el email en Auth: ${revertError.message} — corre el rollback manual en el dashboard).`
          : ' (email de Auth revertido).'
        return NextResponse.json(
          { error: `${dbError.message}.${tail}`, dbErrorCode: (dbError as any).code },
          { status: 400 },
        )
      }
      return NextResponse.json(
        { error: dbError.message, dbErrorCode: (dbError as any).code },
        { status: 400 },
      )
    }

    if (count === 0) {
      console.error(`${TAG} usuarios update affected 0 rows`, { id })
      return NextResponse.json(
        { error: 'La fila no se actualizó (0 filas afectadas). El id puede no existir.' },
        { status: 404 },
      )
    }

    console.log(`${TAG} success`, { id, fields: Object.keys(updatePayload) })
    return NextResponse.json({ user: userData })
  } catch (err: any) {
    console.error(`${TAG} unexpected`, { message: err?.message })
    return NextResponse.json(
      { error: err?.message || 'Error inesperado al actualizar el usuario.' },
      { status: 500 },
    )
  }
}
