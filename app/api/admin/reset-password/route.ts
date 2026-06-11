import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { serverEnv } from '@/lib/env.server'

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
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv
  const { NEXT_PUBLIC_SUPABASE_URL } = env

  const supabaseAdmin = createClient(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

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

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    })

    if (error || !data?.user) {
      console.error(`${TAG} auth.updateUserById failed`, { userId, error: error?.message })
      return NextResponse.json(
        { error: error?.message || 'No se pudo actualizar la contraseña.' },
        { status: 400 },
      )
    }

    console.log(`${TAG} success`, { userId })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error(`${TAG} unexpected`, { message: err?.message })
    return NextResponse.json(
      { error: err?.message || 'Error inesperado al resetear la contraseña.' },
      { status: 500 },
    )
  }
}
