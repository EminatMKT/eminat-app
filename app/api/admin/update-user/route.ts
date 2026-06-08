import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Server-side admin endpoint — atomic user update.
 *
 * The trickiest field is `email`, because it lives in TWO places:
 *   • auth.users (the login identity, only writable by service_role)
 *   • usuarios   (the profile row joined by id, writable via RLS by admin)
 *
 * If those two ever drift apart, the user cannot log in OR cannot be
 * looked up by AppContext (which queries usuarios.email). This route
 * keeps them aligned:
 *   1. If email is changing, update Auth first.
 *   2. Update usuarios with all editable fields.
 *   3. If usuarios fails, revert Auth email back to its previous value.
 *
 * Non-email fields are updated in the same usuarios row; service_role
 * is not strictly required for those, but routing everything through
 * one endpoint keeps the admin UI simple and the rollback symmetric.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY. Never exposed to the browser.
 */
export async function POST(req: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured in this environment.' },
      { status: 500 },
    )
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  try {
    const body = await req.json()
    const { id, currentEmail, email, nombre, apellido, rol, tipo, color, ubicacion, empresa, cargo } = body

    if (!id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 })
    if (!email || !nombre || !apellido) {
      return NextResponse.json(
        { error: 'Campos requeridos: email, nombre, apellido' },
        { status: 400 },
      )
    }

    const emailChanged =
      typeof currentEmail === 'string' &&
      currentEmail.toLowerCase().trim() !== email.toLowerCase().trim()

    // 1. Update Auth email if changed.
    if (emailChanged) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        email,
        email_confirm: true,
      })
      if (authError) {
        return NextResponse.json(
          { error: `Auth: ${authError.message}` },
          { status: 400 },
        )
      }
    }

    // 2. Update usuarios.
    const updatePayload: Record<string, unknown> = {
      email,
      nombre,
      apellido,
      rol,
      tipo,
      color,
      ubicacion,
      empresa,
    }
    if (cargo !== undefined) updatePayload.cargo = cargo

    const { data: userData, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (dbError) {
      // Revert Auth email if it had been changed.
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

    return NextResponse.json({ user: userData })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error inesperado al actualizar el usuario.' },
      { status: 500 },
    )
  }
}
