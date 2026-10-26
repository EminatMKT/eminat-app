import { workerAuthorized } from '@/server/sales-native/quickbooks/worker-auth'
import { Resend } from 'resend'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const payload = z.object({
  state: z.enum(['STALE', 'RECOVERED', 'TEST']),
  incident: z.number().int().nonnegative().max(9999999999),
}).strict()

/** Operational notifications only. No provider tokens, patient data or financial writes. */
export async function POST(request: Request) {
  if (!workerAuthorized(request))
    return Response.json({ code: 'UNAUTHORIZED' }, { status: 401 })
  if (Number(request.headers.get('content-length') ?? 0) > 1024)
    return Response.json({ code: 'INVALID_REQUEST' }, { status: 422 })
  let body: string
  try { body = await request.text() } catch {
    return Response.json({ code: 'INVALID_REQUEST' }, { status: 422 })
  }
  if (Buffer.byteLength(body) > 1024)
    return Response.json({ code: 'INVALID_REQUEST' }, { status: 422 })
  let parsed: ReturnType<typeof payload.safeParse>
  try { parsed = payload.safeParse(JSON.parse(body)) } catch {
    return Response.json({ code: 'INVALID_REQUEST' }, { status: 422 })
  }
  if (!parsed.success) return Response.json({ code: 'INVALID_REQUEST' }, { status: 422 })
  const recipient = process.env.LILLY_QBO_RECONCILE_ALERT_TO ?? ''
  const sender = process.env.PATIENT_EMAIL_FROM_ADDRESS ?? ''
  if (!z.email().safeParse(recipient).success || !z.email().safeParse(sender).success || !process.env.RESEND_API_KEY)
    return Response.json({ code: 'ALERT_NOT_CONFIGURED' }, { status: 503 })
  const { state, incident } = parsed.data
  const descriptions = {
    STALE: 'No successful QBO reconciliation tick has completed for more than 10 minutes. Inspect the dedicated VPS timer and LILLY request logs. Do not replay financial writes manually.',
    RECOVERED: 'The dedicated QBO reconciliation worker has completed a successful tick again.',
    TEST: 'Controlled test of the QBO stale-worker alert channel. No outage, payment or patient change was created.',
  }
  try {
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: `LILLY Operations <${sender}>`, to: recipient,
      subject: `[LILLY QBO] ${state === 'TEST' ? 'Monitor test' : state === 'STALE' ? 'Reconciliation worker stale' : 'Worker recovered'}`,
      text: descriptions[state],
    }, { idempotencyKey: `qbo-worker-${state.toLowerCase()}-${incident}` })
    if (result.error || !result.data?.id) throw new Error('ALERT_FAILED')
    return Response.json({ sent: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    // Stable incident keys protect an uncertain provider result from duplicate sends.
    return Response.json({ code: 'ALERT_UNAVAILABLE' }, { status: 503 })
  }
}
