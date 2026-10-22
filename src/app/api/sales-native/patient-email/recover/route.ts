import { z } from 'zod'
import { patientQboActor } from '@/server/sales-native/patient-qbo-auth'
import { sendPatientActivation, sendPatientInvoice } from '@/server/sales-native/patient-email-delivery'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { isSaleDuration, membershipTypes, plans } from '@/server/sales-native/pricing'

export const dynamic = 'force-dynamic'
const EMC = '9efab353-46a0-43d1-9901-e3f185dc5d30'
const headers = { 'Cache-Control': 'no-store' }
const input = z.object({ intentId: z.uuid(), kind: z.enum(['invoice', 'activation']) }).strict()

/** Recovers a missing outbox entry from the linked business record, never from caller-supplied email. */
export async function POST(request: Request) {
  try {
    const actor = await patientQboActor(request)
    if (!actor?.verifier) return Response.json({ code: 'EMAIL_RECOVERY_FORBIDDEN' }, { status: 403, headers })
    if (Number(request.headers.get('content-length') ?? '0') > 1024)
      return Response.json({ code: 'BODY_TOO_LARGE' }, { status: 413, headers })
    const body: unknown = await request.json()
    if (Buffer.byteLength(JSON.stringify(body)) > 1024)
      return Response.json({ code: 'BODY_TOO_LARGE' }, { status: 413, headers })
    const parsed = input.safeParse(body)
    if (!parsed.success) return Response.json({ code: 'VALIDATION_ERROR' }, { status: 422, headers })
    const { intentId, kind } = parsed.data
    const db = supabaseAdmin({ noStore: true })
    const { data: intent, error: intentError } = await db.from('sales_patient_enrollment_intents')
      .select('patient_identity_id,membership_id,plan,membership_type,duration,amount_cents')
      .eq('organization_id', EMC).eq('id', intentId).maybeSingle()
    if (intentError) return Response.json({ code: 'EMAIL_RECOVERY_UNAVAILABLE' }, { status: 503, headers })
    if (!intent) return Response.json({ code: 'ENROLLMENT_NOT_FOUND' }, { status: 404, headers })
    const { data: qbo, error: qboError } = await db.from('sales_patient_qbo_manual')
      .select('qbo_invoice_number,qbo_hosted_payment_url,verification_state,qa_synthetic')
      .eq('organization_id', EMC).eq('enrollment_intent_id', intentId).maybeSingle()
    if (qboError) return Response.json({ code: 'EMAIL_RECOVERY_UNAVAILABLE' }, { status: 503, headers })
    if (!qbo || qbo.qa_synthetic || !qbo.qbo_invoice_number || !qbo.qbo_hosted_payment_url)
      return Response.json({ code: 'EMAIL_EVENT_NOT_READY' }, { status: 409, headers })
    if (kind === 'invoice' && (!plans.includes(intent.plan) ||
        !membershipTypes.includes(intent.membership_type) || !isSaleDuration(intent.duration) ||
        !Number.isSafeInteger(intent.amount_cents)))
      return Response.json({ code: 'EMAIL_EVENT_NOT_READY' }, { status: 409, headers })
    if (kind === 'activation' && (qbo.verification_state !== 'PAYMENT_VERIFIED' || !intent.membership_id))
      return Response.json({ code: 'EMAIL_EVENT_NOT_READY' }, { status: 409, headers })
    const { data: identity, error: identityError } = await db.from('sales_patient_identities')
      .select('contact_id').eq('organization_id', EMC).eq('id', intent.patient_identity_id).maybeSingle()
    if (identityError || !identity?.contact_id)
      return Response.json({ code: 'EMAIL_RECOVERY_UNAVAILABLE' }, { status: 503, headers })
    const { data: contact, error: contactError } = await db.from('sales_contacts')
      .select('id,email,first_name,do_not_email').eq('organization_id', EMC)
      .eq('id', identity.contact_id).is('archived_at', null).maybeSingle()
    if (contactError || !contact)
      return Response.json({ code: 'EMAIL_RECOVERY_UNAVAILABLE' }, { status: 503, headers })
    if (contact.do_not_email || !contact.email)
      return Response.json({ code: 'EMAIL_NOT_ALLOWED' }, { status: 409, headers })
    if (kind === 'activation') {
      const { data: membership, error: membershipError } = await db.from('sales_memberships')
        .select('status').eq('organization_id', EMC).eq('id', intent.membership_id)
        .eq('primary_contact_id', contact.id).maybeSingle()
      if (membershipError) return Response.json({ code: 'EMAIL_RECOVERY_UNAVAILABLE' }, { status: 503, headers })
      if (membership?.status !== 'ACTIVE')
        return Response.json({ code: 'EMAIL_EVENT_NOT_READY' }, { status: 409, headers })
    }
    const delivery = kind === 'invoice'
      ? await sendPatientInvoice(intentId, contact.email, qbo.qbo_invoice_number, {
        plan: intent.plan, membershipType: intent.membership_type,
        duration: intent.duration, amountCents: intent.amount_cents,
        hostedUrl: qbo.qbo_hosted_payment_url,
      })
      : await sendPatientActivation(intent.membership_id, contact.email, contact.first_name)
    if (delivery.status === 'UNKNOWN')
      return Response.json({ code: 'EMAIL_DELIVERY_UNCERTAIN' }, { status: 409, headers })
    if (delivery.status === 'FAILED' || delivery.status === 'NOT_CONFIGURED')
      return Response.json({ code: 'EMAIL_RECOVERY_UNAVAILABLE' }, { status: 503, headers })
    return Response.json({ status: delivery.status }, { headers })
  } catch {
    return Response.json({ code: 'EMAIL_RECOVERY_UNAVAILABLE' }, { status: 503, headers })
  }
}
