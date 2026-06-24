import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { DEFAULT_ROLE } from '@/shared/auth/permissions'
import { clientEnv } from '@/shared/db/env.client'
import { serverEnv } from '@/shared/db/env.server'

/**
 * Server-side admin endpoint — creates an Auth user AND its companion
 * usuarios row atomically, then (best-effort) sends the new user a
 * welcome email with the temp credentials.
 *
 * • Auth + usuarios creation: ATOMIC. If the usuarios insert fails for
 *   ANY reason (check constraint, RLS, dupe, etc.), the just-created
 *   auth.users row is DELETED so nothing is left half-created.
 * • Welcome email: BEST-EFFORT. If Resend fails or RESEND_API_KEY is
 *   missing, the user is still created and the response includes
 *   `emailWarning` so the UI can warn the admin and prompt them to
 *   share the password manually.
 *
 * Reads SUPABASE_SERVICE_ROLE_KEY and RESEND_API_KEY from server env.
 * Neither secret is ever sent to the browser.
 */

const LOGIN_URL = 'https://app.stratixsolutions.us'
const MAIL_FROM = 'Stratix Solutions <noreply@eminat.net>'
const MAIL_CC = 'freddy@eminat.net'

function buildWelcomeEmail(args: {
  nombre: string
  apellido: string
  email: string
  password: string
  areaLabel: string
  cargo?: string
}): string {
  const { nombre, apellido, email, password, areaLabel, cargo } = args
  const cargoLine = cargo ? `<div style="font-size:12px;color:#A5A7FF;margin-top:4px">${escapeHtml(cargo)}</div>` : ''

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Tu acceso a Stratix Solutions</title>
</head>
<body style="margin:0;padding:0;background:#09090B;font-family:'Helvetica Neue',Arial,sans-serif;color:#ffffff;-webkit-text-size-adjust:100%">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090B">
    <tr><td align="center" style="padding:40px 16px">
      <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;background:#13131C;border:1px solid rgba(255,255,255,0.07);border-radius:18px;overflow:hidden">

        <tr><td style="background:#4F46E5;padding:34px 36px">
          <div style="font-size:11px;font-weight:700;letter-spacing:.22em;color:rgba(255,255,255,0.75);text-transform:uppercase">Stratix Solutions</div>
          <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-.01em;margin-top:6px">Bienvenido, ${escapeHtml(nombre)}</div>
        </td></tr>

        <tr><td style="padding:28px 36px 8px;color:rgba(255,255,255,0.82);font-size:14px;line-height:1.6">
          <p style="margin:0 0 12px">Te creamos una cuenta para que ingreses al sistema operativo de Eminat Group.</p>
        </td></tr>

        <tr><td style="padding:0 36px">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td style="padding-top:14px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,0.45)">Área asignada</td></tr>
            <tr><td style="padding:4px 0 0;font-size:15px;color:#ffffff;font-weight:600">${escapeHtml(areaLabel)}${cargoLine}</td></tr>

            <tr><td style="padding-top:18px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,0.45)">Email</td></tr>
            <tr><td style="padding:4px 0 0;font-size:14px;color:#ffffff;font-family:'Courier New',monospace">${escapeHtml(email)}</td></tr>

            <tr><td style="padding-top:18px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,0.45)">Contraseña temporal</td></tr>
            <tr><td style="padding:6px 0 0">
              <div style="padding:14px 16px;background:#0A0A0F;border:1px solid rgba(124,58,237,0.45);border-radius:10px;font-family:'Courier New',monospace;font-size:18px;color:#ffffff;letter-spacing:.05em;text-align:center;font-weight:700">${escapeHtml(password)}</div>
            </td></tr>
            <tr><td style="padding:8px 0 0;font-size:11px;color:rgba(255,255,255,0.55)">Cámbiala en tu primer inicio de sesión.</td></tr>
          </table>
        </td></tr>

        <tr><td align="center" style="padding:28px 36px">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="background:#4F46E5;border-radius:999px">
              <a href="${LOGIN_URL}" style="display:inline-block;padding:14px 30px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none">Acceder al sistema</a>
            </td></tr>
          </table>
          <div style="margin-top:14px;font-size:12px;color:rgba(255,255,255,0.45)">${LOGIN_URL}</div>
        </td></tr>

        <tr><td style="padding:22px 36px;border-top:1px solid rgba(255,255,255,0.07);font-size:11px;color:rgba(255,255,255,0.4);text-align:center;line-height:1.6">
          The operating system of Eminat Group<br/>
          Si no esperabas este mensaje, ignóralo o contacta a marketing@eminat.net
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

async function sendWelcomeEmail(args: {
  nombre: string
  apellido: string
  email: string
  password: string
  areaLabel: string
  cargo?: string
}): Promise<string | null> {
  try {
    const { RESEND_API_KEY } = serverEnv
    const resend = new Resend(RESEND_API_KEY)
    const html = buildWelcomeEmail(args)
    const { error } = await resend.emails.send({
      from: MAIL_FROM,
      to: args.email,
      cc: MAIL_CC,
      subject: 'Tu acceso a Stratix Solutions',
      html,
    })
    if (error) return `No se envió el correo: ${error.message}`
    return null
  } catch (err: any) {
    return `No se envió el correo: ${err?.message || 'error desconocido'}`
  }
}

const TAG = '[admin/create-user]'

export async function POST(req: NextRequest) {
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv
  const { NEXT_PUBLIC_SUPABASE_URL } = clientEnv

  const supabaseAdmin = createClient(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
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
      console.error(`${TAG} auth.createUser failed`, { email, error: authError?.message })
      return NextResponse.json(
        { error: authError?.message || 'No se pudo crear el usuario en Auth.' },
        { status: 400 },
      )
    }
    userId = authData.user.id
    console.log(`${TAG} auth user created`, { email, userId })

    // 2. Companion usuarios row. id MUST equal the Auth user id so
    //    profile lookups by id (and JWT claims) work consistently.
    const { data: userData, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: userId,
        nombre,
        apellido,
        email,
        rol: rol || DEFAULT_ROLE,
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
      console.error(`${TAG} usuarios insert failed — rolling back auth`, {
        userId,
        email,
        code: (dbError as any).code,
        error: dbError.message,
      })
      // Rollback Auth user. If the rollback itself fails, surface both
      // errors so the admin knows there is an orphan auth.users row to
      // clean up manually from the Supabase Dashboard.
      const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (rollbackError) {
        console.error(`${TAG} auth rollback ALSO failed — ORPHAN auth.users row`, {
          userId,
          email,
          error: rollbackError.message,
        })
      }
      const detail = rollbackError
        ? ` (rollback de la cuenta de Auth también falló: ${rollbackError.message} — borra el auth.users con id ${userId} desde el dashboard de Supabase).`
        : ' (la cuenta de Auth fue revertida; no hay orphan).'
      return NextResponse.json(
        { error: `${dbError.message}.${detail}`, dbErrorCode: (dbError as any).code },
        { status: 400 },
      )
    }

    console.log(`${TAG} usuarios inserted`, { userId, email })

    // 3. Best-effort welcome email. Never fails the request.
    const { data: roleRow } = await supabaseAdmin.from('roles').select('label').eq('key', rol || DEFAULT_ROLE).maybeSingle()
    const areaLabel = roleRow?.label || (rol || DEFAULT_ROLE)
    const emailWarning = await sendWelcomeEmail({ nombre, apellido, email, password, areaLabel, cargo })
    if (emailWarning) console.warn(`${TAG} email warning`, { userId, email, emailWarning })

    console.log(`${TAG} success`, { userId, email })
    return NextResponse.json({ user: userData, emailWarning }, { status: 201 })
  } catch (err: any) {
    console.error(`${TAG} unexpected — attempting auth rollback`, { userId, message: err?.message })
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
