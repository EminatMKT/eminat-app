import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await req.json()
    const { email, password, nombre, apellido, rol, tipo, color, empresa, ubicacion, cargo } = body

    if (!email || !password || !nombre || !apellido) {
      return NextResponse.json({ error: 'Campos requeridos: email, password, nombre, apellido' }, { status: 400 })
    }

    // 1. Create user in Supabase Auth (email confirmed, no confirmation email sent)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // 2. Insert into usuarios table
    const { data: userData, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .upsert({
        id: userId,
        nombre,
        apellido,
        email,
        rol: rol || 'pasante',
        tipo: tipo || 'B',
        color: color || '#7C6FF7',
        empresa: empresa || 'Eminat Holding',
        ubicacion: ubicacion || 'Guayaquil, Ecuador',
        cargo: cargo || '',
        activo: true,
        validado: true,
      })
      .select()
      .single()

    if (dbError) {
      // Auth user was created but DB insert failed — clean up
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: `Usuario Auth creado pero fallo la insercion en DB: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json({ user: userData }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
