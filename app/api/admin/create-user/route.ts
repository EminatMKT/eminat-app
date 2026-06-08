import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Server-side admin endpoint — creates an Auth user AND its companion
 * usuarios row atomically. If the usuarios insert fails for ANY reason
 * (check constraint, RLS, dupe, etc.) the just-created Auth user is
 * DELETED so nothing is left half-created.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in the server env. The key is read
 * here only — it is NEVER sent to the browser.
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

  let userId: string | null = null

  try {
    const body = await req.json()
    const { email, password, nombre, apellido, rol, tipo, color, empresa, ubicacion, cargo } = body

    if (!email || !password || !nombre || !apellido) {
      return NextResponse.json(
        { error: 'Campos requeridos: email, password, nombre, apellido' },
        { status: 400 },
      )
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres.' },
        { status: 400 },
      )
    }

    // 1. Auth user. email_confirm:true → no confirmation email sent.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: authError?.message || 'No se pudo crear el usuario en Auth.' },
        { status: 400 },
      )
    }
    userId = authData.user.id

    // 2. Companion usuarios row. id MUST equal the Auth user id so
    //    profile lookups by id (and JWT claims) work consistently.
    const { data: userData, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: userId,
        nombre,
        apellido,
        email,
        rol: rol || 'stratix360',
        tipo: tipo || 'B',
        color: color || '#7C6FF7',
        empresa: empresa || 'Eminat Group',
        ubicacion: ubicacion || 'Guayaquil, Ecuador',
        cargo: cargo || '',
        activo: true,
        validado: true,
      })
      .select()
      .single()

    if (dbError) {
      // Rollback Auth user. If the rollback itself fails, surface both
      // errors so the admin knows there is an orphan auth.users row to
      // clean up manually from the Supabase Dashboard.
      const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      const detail = rollbackError
        ? ` (rollback de la cuenta de Auth también falló: ${rollbackError.message} — borra el auth.users con id ${userId} desde el dashboard de Supabase).`
        : ' (la cuenta de Auth fue revertida; no hay orphan).'
      return NextResponse.json(
        { error: `${dbError.message}.${detail}`, dbErrorCode: (dbError as any).code },
        { status: 400 },
      )
    }

    return NextResponse.json({ user: userData }, { status: 201 })
  } catch (err: any) {
    // Defensive: also try rollback on unexpected failure.
    if (userId) {
      try { await supabaseAdmin.auth.admin.deleteUser(userId) } catch {}
    }
    return NextResponse.json(
      { error: err?.message || 'Error inesperado al crear el usuario.' },
      { status: 500 },
    )
  }
}
