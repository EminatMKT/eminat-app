import { timingSafeEqual } from 'node:crypto'
import { drainPatientEmailOutbox } from '@/server/sales-native/patient-email-outbox'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? ''
  const supplied = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  if (!secret || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected)))
    return Response.json({ code: 'UNAUTHORIZED' }, { status: 401 })
  try {
    const result = await drainPatientEmailOutbox()
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ code: 'PATIENT_EMAIL_OUTBOX_UNAVAILABLE' }, { status: 503 })
  }
}
