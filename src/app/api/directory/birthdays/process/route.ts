import { NextRequest, NextResponse } from 'next/server'
import processBirthdays from '@/features/directorio/server/process-birthdays'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ error: 'Scheduler desactivado' }, { status: 503 })
  }
  try {
    return NextResponse.json(await processBirthdays())
  } catch {
    return NextResponse.json({ error: 'Error procesando cumpleaños' }, { status: 500 })
  }
}
