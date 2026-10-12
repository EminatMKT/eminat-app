import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { processMeetingMail } from '@/features/meet/server/mail-outbox'
import { MODULE } from '@/shared/auth/permissions'
import { RPCS } from '@/shared/schema'

export const runtime = 'nodejs'
const headers = { 'Cache-Control': 'private, no-store' }

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
  if (!secret) return NextResponse.json({ error: 'Worker not configured' }, { status: 503, headers })
  const a = Buffer.from(secret), b = Buffer.from(supplied)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  try {
    const result = await processMeetingMail()
    return NextResponse.json(result, { status: result.warning ? 503 : 200, headers })
  } catch { return NextResponse.json({ error: 'Meeting mail worker unavailable' }, { status: 503, headers }) }
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
  const body = await request.json().catch(() => null)
  if (!body || typeof body.meetingId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.meetingId)) {
    return NextResponse.json({ error: 'Invalid Meeting' }, { status: 400, headers })
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!token || !url || !key) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  const client = createClient(url, key, { auth: { persistSession: false }, global: { headers: { Authorization: 'Bearer ' + token } } })
  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError || !auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  const { data: allowed, error: accessError } = await client.rpc(RPCS.hasModule, { p_slug: MODULE.REUNIONES })
  const { data: profile } = await client.from('usuarios').select('id').eq('auth_id', auth.user.id).eq('activo', true).maybeSingle()
  const { data: meeting, error: meetingError } = await client.from('meetings').select('user_id').eq('id', body.meetingId).maybeSingle()
  if (accessError || !allowed || !profile || meetingError || meeting?.user_id !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers })
  }
  try {
    const result = await processMeetingMail({ meetingId: body.meetingId })
    return NextResponse.json(result, { status: result.warning ? 202 : 200, headers })
  } catch { return NextResponse.json({ error: 'Meeting notifications remain pending' }, { status: 503, headers }) }
}

