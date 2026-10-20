import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { patientQboActor } from '@/server/sales-native/patient-qbo-auth'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'

export const dynamic = 'force-dynamic'
const EMC = '9efab353-46a0-43d1-9901-e3f185dc5d30'
const noStore = { 'Cache-Control': 'no-store' }
const input = z.object({
  intentId: z.uuid(), phone: z.string().trim().min(1).max(80),
  address: z.string().trim().min(1).max(1000),
  confirmation: z.literal('ACTIVATE VERIFIED MEMBERSHIP'),
}).strict()

export async function POST(request: Request) {
  const actor = await patientQboActor(request)
  if (!actor?.verifier) return Response.json({ code: 'MEMBERSHIP_ACTIVATION_FORBIDDEN' },
    { status: 403, headers: noStore })
  if (Number(request.headers.get('content-length') ?? '0') > 4096)
    return Response.json({ code: 'BODY_TOO_LARGE' }, { status: 413, headers: noStore })
  let json: unknown
  try { json = await request.json() } catch {
    return Response.json({ code: 'INVALID_JSON' }, { status: 400, headers: noStore })
  }
  const parsed = input.safeParse(json)
  if (!parsed.success) return Response.json({ code: 'VALIDATION_ERROR' }, { status: 422, headers: noStore })
  const { intentId, phone, address } = parsed.data
  const db = supabaseAdmin({ noStore: true })
  const { data: intent, error: intentError } = await db.from('sales_patient_enrollment_intents')
    .select('id,organization_id,patient_identity_id,opportunity_id,plan,membership_type,duration,amount_cents,membership_id')
    .eq('organization_id',EMC).eq('id',intentId).maybeSingle()
  if (intentError || !intent?.opportunity_id) return Response.json({ code: 'INTENT_NOT_FOUND' },
    { status: 404, headers: noStore })
  if (intent.membership_id) return Response.json({ code: 'ALREADY_ACTIVE' }, { status: 409, headers: noStore })
  const { data: evidence, error: evidenceError } = await db.from('sales_patient_qbo_manual')
    .select('sales_payment_id,verification_state,finance_verification_status,qbo_payment_status,qa_synthetic,qbo_payment_verified_by')
    .eq('organization_id',EMC).eq('enrollment_intent_id',intentId).maybeSingle()
  if (evidenceError || !evidence || evidence.verification_state !== 'PAYMENT_VERIFIED' ||
      evidence.finance_verification_status !== 'VERIFIED' ||
      !['PAID','VERIFIED'].includes(evidence.qbo_payment_status) ||
      evidence.qbo_payment_verified_by !== actor.memberId || !evidence.sales_payment_id)
    return Response.json({ code: 'PAYMENT_NOT_VERIFIED' }, { status: 403, headers: noStore })
  const { data: identity, error: identityError } = await db.from('sales_patient_identities')
    .select('contact_id').eq('organization_id',EMC).eq('id',intent.patient_identity_id).maybeSingle()
  if (identityError || !identity?.contact_id)
    return Response.json({ code: 'CONTACT_NOT_FOUND' }, { status: 404, headers: noStore })
  const { data: contact, error: contactError } = await db.from('sales_contacts')
    .select('id,first_name,last_name,email').eq('organization_id',EMC)
    .eq('id',identity.contact_id).is('archived_at',null).maybeSingle()
  if (contactError || !contact?.first_name || !contact.last_name || !contact.email)
    return Response.json({ code: 'CONTACT_INCOMPLETE' }, { status: 422, headers: noStore })
  const issuedAt = new Date().toISOString().slice(0,10)
  const key = `patient-qbo-${intentId}`
  const fields = [evidence.sales_payment_id,contact.id,intent.plan,intent.membership_type,
    intent.duration,issuedAt,contact.first_name,contact.last_name,phone,contact.email,
    address,evidence.qa_synthetic]
  const hash = createHash('sha256').update(JSON.stringify(fields)).digest('hex')
  const { data, error } = await db.rpc('native_sales_issue_membership', {
    p_organization_id:EMC,p_actor_member_id:actor.memberId,
    p_payment_id:evidence.sales_payment_id,p_contact_id:contact.id,
    p_plan:intent.plan,p_membership_type:intent.membership_type,
    p_duration:intent.duration,p_issued_at:issuedAt,
    p_first_name:contact.first_name,p_last_name:contact.last_name,
    p_phone:phone,p_email:contact.email,p_address:address,
    p_is_demo:evidence.qa_synthetic,p_idempotency_key:key,
    p_payload_hash:hash,p_request_id:randomUUID(),
  })
  if (error) return nativeSalesDatabaseError(error)
  return Response.json({ data }, { status: 201, headers: noStore })
}
