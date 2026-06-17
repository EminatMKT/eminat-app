import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { serverEnv } from '@/lib/env.server'

const { RESEND_API_KEY } = serverEnv
const resend = new Resend(RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
