import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { nativeSalesErrorResponse } from '@/server/sales-native/auth'
import { patientQboActor } from '@/server/sales-native/patient-qbo-auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'

export const dynamic = 'force-dynamic'
const noStore = { 'Cache-Control': 'no-store' }
const form = z.object({
  intentId: z.uuid(),
  invoiceNumber: z.string().trim().min(1).max(80),
  evidence: z.string().trim().min(8).max(500),
  confirmation: z.literal('CONFIRM VOID IN QBO'),
}).strict()

export async function POST(request: Request) {
  try {
    const actor = await patientQboActor(request)
    if (!actor?.verifier)
      return Response.json({ code: 'PATIENT_QBO_VOID_FORBIDDEN' }, { status: 403, headers: noStore })
    if (Number(request.headers.get('content-length') ?? '0') > 8192)
      return Response.json({ code: 'BODY_TOO_LARGE' }, { status: 413, headers: noStore })
    const raw: unknown = await request.json()
    if (Buffer.byteLength(JSON.stringify(raw)) > 8192)
      return Response.json({ code: 'BODY_TOO_LARGE' }, { status: 413, headers: noStore })
    const parsed = form.safeParse(raw)
    if (!parsed.success)
      return Response.json({ code: 'VALIDATION_ERROR' }, { status: 422, headers: noStore })
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_patient_confirm_invoice_void', {
      p_intent_id: parsed.data.intentId,
      p_actor_member_id: actor.memberId,
      p_invoice_number: parsed.data.invoiceNumber,
      p_evidence: parsed.data.evidence,
      p_request_id: randomUUID(),
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({ data }, { headers: noStore })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
