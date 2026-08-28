import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { DEFAULT_ROLE } from '@/shared/auth/permissions'
import { clientEnv } from '@/shared/db/env.client'
import { serverEnv } from '@/shared/db/env.server'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { requireAdmin } from '@/shared/db/requireAdmin'
import { syncUsuarioCargos, cargoNames } from '@/shared/db/usuarioCargos'
import { MAIL_FROM, MARKETING_COORDINATOR_EMAIL, MARKETING_INBOX_EMAIL } from '@/shared/constants/contacts'

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
 * Reads SUPABASE_SECRET_KEY and RESEND_API_KEY from server env.
 * Neither secret is ever sent to the browser.
 */

const LOGIN_URL = 'https://app.stratixsolutions.us'
const MAIL_CC = MARKETING_COORDINATOR_EMAIL
const APP_ENV = clientEnv.NEXT_PUBLIC_APP_ENV

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
            <tr><td style="padding:8px 0 0;font-size:11px;color:rgba(255,255,255,0.55)">Es temporal: cambiala apenas entres, desde tu perfil.</td></tr>
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
          Si no esperabas este mensaje, ignóralo o contacta a ${MARKETING_INBOX_EMAIL}
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
    if (!RESEND_API_KEY) return 'No se envió el correo: falta RESEND_API_KEY.'
    // Fuera de producción NO se manda nada: el destinatario es una casilla
    // corporativa real y la contraseña viaja en el cuerpo. Probar el alta
    // contra la base local no puede terminar en el buzón de un compañero.
    // El texto NO cierra pidiendo compartirla a mano: CredentialsPanel ya
    // agrega `admin.shareManually` a continuación de este warning.
    if (APP_ENV !== 'production') {
      return `No se envió el correo: el entorno es "${APP_ENV}", no producción.`
    }
    const resend = new Resend(RESEND_API_KEY)
    const html = buildWelcomeEmail(args)
    const { error } = await resend.emails.send({
      from: MAIL_FROM,
      to: args.email,
      cc: MAIL_CC,
      subject: 'Tu acceso a Stratix Solutions',
      html,
    })
    // El punto final importa: CredentialsPanel concatena este texto con
    // `admin.shareManually`, y los mensajes de Resend no traen puntuación.
    if (error) return `No se envió el correo: ${error.message}.`
    return null
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ''
    return `No se envió el correo: ${message || 'error desconocido'}.`
  }
}

const TAG = '[admin/create-user]'

export async function POST(req: NextRequest) {
  const authz = await requireAdmin()
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const db = supabaseAdmin()

  let userId: string | null = null

  try {
    const body = await req.json()
    const { email, password, nombre, apellido, rol, color, empresa_id, jornada_id, vinculacion_id, ubicacion, equipo_id, cargoIds = [] } = body

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

    // 0. ¿Ya hay una fila para este correo? Pasa con toda persona que exista
    //    en `usuarios` sin cuenta —lo que dejan los seeds, y lo que queda si un
    //    borrado se abortó a mitad—. Sin esto el INSERT de abajo choca contra
    //    el índice único de email, se hace rollback del Auth, y esa persona
    //    nunca puede tener acceso desde el panel.
    //    Se ENLAZA, no se inserta: el `id` viejo se conserva porque las
    //    actividades le apuntan por FK. Queda id != auth_id, que es el caso
    //    que reset-password y delete-user ya resuelven probando ambos.
    const { data: existing } = await db
      .from('usuarios')
      .select('id, auth_id, nombre, apellido')
      .eq('email', email)
      .maybeSingle()

    if (existing?.auth_id) {
      return NextResponse.json(
        { error: `${existing.nombre} ${existing.apellido} ya tiene una cuenta con ese correo. Usa "Restablecer" para cambiarle la contraseña.` },
        { status: 409 },
      )
    }

    // 1. Auth user. email_confirm:true → no confirmation email sent.
    const { data: authData, error: authError } = await db.auth.admin.createUser({
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

    // 2. La fila de `usuarios`. En el alta nueva el id ES el de Auth, para que
    //    las búsquedas por id (y los claims del JWT) resuelvan igual. En el
    //    enlace de una fila que ya existía se conserva su id y solo se setea
    //    `auth_id`, porque cambiarlo desprendería sus actividades.
    const campos = {
      nombre,
      apellido,
      rol: rol || DEFAULT_ROLE,
      color: color || '#7C6FF7',
      ubicacion: ubicacion || 'Guayaquil, Ecuador',
      activo: true,
      validado: true,
    }
    // Los catálogos van aparte porque enlazar y crear los tratan distinto. Al
    // crear, un campo vacío es null y listo. Al ENLAZAR, la persona ya podía
    // tener empresa, jornada o equipo cargados: pisarlos con null porque el
    // admin no volvió a elegirlos le borraría datos —y en el caso de `equipo_id`
    // la dejaría sin poder recibir tareas—. Dar de alta no es editar: solo se
    // escribe lo que se eligió explícitamente.
    const catalogos = { empresa_id, jornada_id, vinculacion_id, equipo_id }
    const catalogosCrear = Object.fromEntries(
      Object.entries(catalogos).map(([k, v]) => [k, v || null]),
    )
    const catalogosEnlazar = Object.fromEntries(
      Object.entries(catalogos).filter(([, v]) => v),
    )

    const { data: userData, error: dbError } = existing
      ? await db.from('usuarios').update({ ...campos, ...catalogosEnlazar, auth_id: userId }).eq('id', existing.id).select().single()
      : await db.from('usuarios').insert({ ...campos, ...catalogosCrear, id: userId, auth_id: userId, email }).select().single()

    if (dbError) {
      const dbErrorCode = (dbError as { code?: string }).code
      console.error(`${TAG} usuarios ${existing ? 'link' : 'insert'} failed — rolling back auth`, {
        userId,
        email,
        code: dbErrorCode,
        error: dbError.message,
      })
      // Rollback Auth user. If the rollback itself fails, surface both
      // errors so the admin knows there is an orphan auth.users row to
      // clean up manually from the Supabase Dashboard.
      const { error: rollbackError } = await db.auth.admin.deleteUser(userId)
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
        { error: `${dbError.message}.${detail}`, dbErrorCode },
        { status: 400 },
      )
    }

    // El id de la fila de `usuarios`, que NO es el de Auth cuando se enlazó
    // una preexistente. Todo lo que referencia a la persona usa este.
    const usuarioId = existing ? existing.id : userId
    console.log(`${TAG} usuarios ${existing ? 'linked' : 'inserted'}`, { usuarioId, authId: userId, email })

    // 3. Cargos N:N. Best-effort igual que el email: el usuario ya existe, un
    //    fallo acá se corrige desde Editar usuario sin dejar nada a medias.
    //    Al ENLAZAR con la lista vacía NO se sincroniza: `syncUsuarioCargos`
    //    borra lo que no venga, así que no elegir cargos le vaciaría los que la
    //    persona ya tenía. Misma regla que los catálogos de arriba: dar de alta
    //    escribe lo que se eligió, no borra lo que no se tocó.
    if (!existing || cargoIds.length) {
      const cargoErr = await syncUsuarioCargos(db, usuarioId, cargoIds)
      if (cargoErr) console.warn(`${TAG} cargos no asignados`, { usuarioId, error: cargoErr.message })
    }
    const cargo = await cargoNames(db, cargoIds)

    // 4. Best-effort welcome email. Never fails the request.
    const { data: roleRow } = await db.from('roles').select('label').eq('key', rol || DEFAULT_ROLE).maybeSingle()
    const areaLabel = roleRow?.label || (rol || DEFAULT_ROLE)
    const emailWarning = await sendWelcomeEmail({ nombre, apellido, email, password, areaLabel, cargo })
    if (emailWarning) console.warn(`${TAG} email warning`, { userId, email, emailWarning })

    console.log(`${TAG} success`, { userId, email })
    return NextResponse.json({ user: userData, emailWarning }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ''
    console.error(`${TAG} unexpected — attempting auth rollback`, { userId, message })
    // Defensive: also try rollback on unexpected failure.
    if (userId) {
      try { await db.auth.admin.deleteUser(userId) } catch {}
    }
    return NextResponse.json(
      { error: message || 'Error inesperado al crear el usuario.' },
      { status: 500 },
    )
  }
}
