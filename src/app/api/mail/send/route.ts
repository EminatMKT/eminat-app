import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { serverEnv } from '@/shared/db/env.server'
import { requireModule } from '@/shared/db/requireAccess'

// Perezoso a propósito: `new Resend(undefined)` tira "Missing API key", y a
// nivel de módulo eso rompe la ruta entera al importarla. Construyéndolo acá
// adentro, sin key la respuesta es un 503 legible en vez de un 500 opaco.
function getResend() {
  const { RESEND_API_KEY } = serverEnv
  return RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null
}

export async function POST(req: NextRequest) {
  try {
    // Gate ANTES de tocar Resend: sin esto la ruta es un relay abierto —el caller elige `from`,
    // y el dominio está verificado a nombre de Eminat—. Se pide el módulo `research` porque su
    // único llamador es el modal de campañas de Research (MailCampaignModal).
    const authz = await requireModule('research')
    if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

    const resend = getResend()
    if (!resend) {
      return NextResponse.json({ error: 'Envío de correo no configurado: falta RESEND_API_KEY.' }, { status: 503 })
    }
    const body = await req.json()
    const { to, subject, html, from } = body

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, html' }, { status: 400 })
    }

    const recipients = Array.isArray(to) ? to : [to]

    // Send in batches of 50 to avoid rate limits
    const batchSize = 50
    const results = []

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      const { data, error } = await resend.emails.send({
        from: from || 'Stratix Solutions <noreply@stratixsolutions.us>',
        to: batch,
        subject,
        html,
      })

      if (error) {
        return NextResponse.json({ error: error.message, sent: results.length }, { status: 500 })
      }
      results.push(data)
    }

    return NextResponse.json({
      success: true,
      total_sent: recipients.length,
      batches: results.length,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ''
    return NextResponse.json({ error: message || 'Internal server error' }, { status: 500 })
  }
}
