import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import dispatchTaskAssignmentEmails from '@/features/tasks/server/notifications'

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
