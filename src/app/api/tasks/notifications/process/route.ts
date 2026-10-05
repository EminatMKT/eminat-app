import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import dispatchTaskAssignmentEmails from '@/features/tasks/server/notifications'
import requireModule from '@/shared/db/requireAccess/requireModule'
import ssrClient from '@/shared/db/requireAccess/ssrClient'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') || ''
  if (!secret) return NextResponse.json({ error: 'Procesador no configurado.' }, { status: 503 })
  const expected = Buffer.from(secret)
  const received = Buffer.from(supplied)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
  const result = await dispatchTaskAssignmentEmails()
  return NextResponse.json(result, { status: result.warning ? 503 : 200,
    headers: { 'Cache-Control': 'private, no-store' } })
}

// Editors can flush the outbox for a Task visible through their own RLS session.
// Recipients remain fixed by the database assignment events.
export async function POST(request: NextRequest) {
  const session = await requireModule('tasks')
  if (!session.ok) return NextResponse.json({ error: session.error }, { status: session.status })
  const body = await request.json().catch(() => null)
  const activityId = body?.activityId
  if (typeof activityId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(activityId)) {
    return NextResponse.json({ error: 'Tarea inválida.' }, { status: 400 })
  }
  const { data } = await ssrClient().from('actividades').select('id').eq('id', activityId).maybeSingle()
  if (!data) return NextResponse.json({ error: 'Tarea no disponible.' }, { status: 404 })
  const result = await dispatchTaskAssignmentEmails(activityId)
  return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
}
