import { z } from 'zod'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { nativeSalesErrorResponse } from '@/server/sales-native/auth'
import { patientQboActor } from '@/server/sales-native/patient-qbo-auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { sendPatientInvoice } from '@/server/sales-native/patient-email-delivery'

export const dynamic = 'force-dynamic'
const EMC = '9efab353-46a0-43d1-9901-e3f185dc5d30'
const noStore = { 'Cache-Control': 'no-store' }
const url = z.url().max(2048).refine(value => {
  const parsed = new URL(value)
  return parsed.protocol === 'https:' && parsed.hostname === 'connect.intuit.com' &&
    parsed.pathname.startsWith('/t/') && parsed.username === '' && parsed.password === ''
})
const form = z.object({
  intentId: z.uuid(),
  action: z.enum(['OPEN','RECORD_INVOICE','REPORT_PAYMENT','VERIFY_PAYMENT','REJECT_PAYMENT']),
  invoiceNumber: z.string().trim().min(1).max(80).optional(),
  invoiceReference: z.string().trim().max(200).optional(),
  customerReference: z.string().trim().max(200).optional(),
  itemReference: z.string().trim().max(200).optional(),
  invoiceAmountCents: z.number().int().positive().optional(),
  hostedUrl: url.optional(),
  paymentReference: z.string().trim().min(8).max(200).optional(),
  paymentConfirmedAt: z.iso.datetime({ offset: true }).optional(),
  qaSynthetic: z.boolean().default(false),
  confirmation: z.enum(['VERIFY PAID IN QBO','VERIFY QA SYNTHETIC NO REAL PAYMENT']).optional(),
}).strict()


export async function GET(request: Request) {
  try {
    if (new URL(request.url).searchParams.size)
      return Response.json({ code: 'INVALID_FILTER' }, { status: 422, headers: noStore })
    const member = await patientQboActor(request)
    if (!member) return Response.json({ code: 'SALES_ACCESS_DENIED' }, { status: 403, headers: noStore })
    const db = supabaseAdmin({ noStore: true })
    let query = db.from('sales_patient_enrollment_intents')
      .select('id,patient_identity_id,opportunity_id,plan,membership_type,duration,amount_cents,status,membership_id,created_at')
      .eq('organization_id',EMC).not('opportunity_id','is',null)
      .order('created_at',{ascending:false}).limit(100)
    if (!member.verifier) {
      const { data: owned, error: ownedError } = await db.from('sales_opportunities')
        .select('id').eq('organization_id',EMC).eq('owner_member_id',member.memberId)
        .is('archived_at',null).limit(100)
      if (ownedError) return nativeSalesDatabaseError(ownedError)
      const ids = (owned ?? []).map(row => row.id)
      if (!ids.length) return Response.json({ data: [], canVerify: false }, { headers: noStore })
      query = query.in('opportunity_id',ids)
    }
    const { data: intents, error: intentsError } = await query
    if (intentsError) return nativeSalesDatabaseError(intentsError)
    if (!intents?.length) return Response.json({ data: [], canVerify: member.verifier }, { headers: noStore })
    const intentIds = intents.map(row => row.id)
    const identityIds = intents.map(row => row.patient_identity_id)
    const [{ data: qbo, error: qboError },{ data: identities, error: identityError }] = await Promise.all([
      db.from('sales_patient_qbo_manual').select('*').eq('organization_id',EMC)
        .in('enrollment_intent_id',intentIds),
      db.from('sales_patient_identities').select('id,contact_id').eq('organization_id',EMC)
        .in('id',identityIds),
    ])
    if (qboError || identityError) return Response.json({ code: 'SALES_UNAVAILABLE' }, { status: 503, headers: noStore })
    const contactIds = (identities ?? []).map(row => row.contact_id)
    const { data: contacts, error: contactsError } = contactIds.length
      ? await db.from('sales_contacts').select('id,display_name').eq('organization_id',EMC)
        .in('id',contactIds)
      : { data: [], error: null }
    if (contactsError) return nativeSalesDatabaseError(contactsError)
    const contactById = new Map((contacts ?? []).map(row => [row.id,row.display_name]))
    const identityById = new Map((identities ?? []).map(row => [row.id,row.contact_id]))
    const verifierIds = Array.from(new Set((qbo ?? []).map(row => row.qbo_payment_verified_by)
      .filter((id): id is string => typeof id === 'string')))
    const { data: verifiers, error: verifiersError } = verifierIds.length
      ? await db.from('sales_members').select('id,display_name').eq('organization_id',EMC)
        .in('id',verifierIds)
      : { data: [], error: null }
    if (verifiersError) return nativeSalesDatabaseError(verifiersError)
    const verifierById = new Map((verifiers ?? []).map(row => [row.id,row.display_name]))
    const qboByIntent = new Map((qbo ?? []).map(row => [row.enrollment_intent_id, {
      ...row, qbo_payment_verified_name: row.qbo_payment_verified_by
        ? verifierById.get(row.qbo_payment_verified_by) ?? null : null,
    }]))
    return Response.json({ data: intents.map(intent => ({
      ...intent, contact_name: contactById.get(identityById.get(intent.patient_identity_id) ?? '') ?? '—',
      qbo: qboByIntent.get(intent.id) ?? null,
    })), canVerify: member.verifier }, { headers: noStore })
  } catch { return Response.json({ code: 'SALES_UNAVAILABLE' }, { status: 503, headers: noStore }) }
}

export async function POST(request: Request) {
  try {
    const member = await patientQboActor(request)
    if (!member?.verifier)
      return Response.json({ code: 'PAYMENT_VERIFICATION_FORBIDDEN' }, { status: 403, headers: noStore })
    if (Number(request.headers.get('content-length') ?? '0') > 8192)
      return Response.json({ code: 'BODY_TOO_LARGE' }, { status: 413, headers: noStore })
    let body: unknown
    try { body = await request.json() } catch {
      return Response.json({ code: 'INVALID_JSON' }, { status: 400, headers: noStore })
    }
    if (Buffer.byteLength(JSON.stringify(body)) > 8192)
      return Response.json({ code: 'BODY_TOO_LARGE' }, { status: 413, headers: noStore })
    const parsed = form.safeParse(body)
    if (!parsed.success) return Response.json({ code: 'VALIDATION_ERROR' }, { status: 422, headers: noStore })
    const p = parsed.data
    if (p.action === 'VERIFY_PAYMENT' && (p.confirmation !==
      (p.qaSynthetic ? 'VERIFY QA SYNTHETIC NO REAL PAYMENT' : 'VERIFY PAID IN QBO') ||
      !p.paymentReference || !p.paymentConfirmedAt))
      return Response.json({ code: 'EXPLICIT_PAYMENT_CONFIRMATION_REQUIRED' }, { status: 422, headers: noStore })
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_patient_qbo_update', {
      p_intent_id:p.intentId,p_actor_member_id:member.memberId,p_action:p.action,
      p_invoice_number:p.invoiceNumber ?? null,p_invoice_reference:p.invoiceReference ?? null,
      p_customer_reference:p.customerReference ?? null,p_item_reference:p.itemReference ?? null,
      p_invoice_amount_cents:p.invoiceAmountCents ?? null,p_hosted_url:p.hostedUrl ?? null,
      p_qr_reference:null,p_payment_reference:p.paymentReference ?? null,
      p_payment_confirmed_at:p.paymentConfirmedAt ?? null,p_qa_synthetic:p.qaSynthetic,
    })
    if (error) return nativeSalesDatabaseError(error)
    let emailDelivery: string | null = null
    if (p.action === 'RECORD_INVOICE' && p.invoiceNumber && p.hostedUrl && !p.qaSynthetic) {
      const db = supabaseAdmin({ noStore: true })
      const { data: intent } = await db.from('sales_patient_enrollment_intents')
        .select('patient_identity_id').eq('organization_id', EMC).eq('id', p.intentId).maybeSingle()
      if (intent) {
        const { data: identity } = await db.from('sales_patient_identities')
          .select('contact_id').eq('organization_id', EMC).eq('id', intent.patient_identity_id).maybeSingle()
        if (identity) {
          const { data: contact } = await db.from('sales_contacts')
            .select('email,do_not_email').eq('organization_id', EMC).eq('id', identity.contact_id).maybeSingle()
          if (contact?.email && !contact.do_not_email)
            emailDelivery = (await sendPatientInvoice(p.intentId, contact.email, p.invoiceNumber)).status
        }
      }
    }
    return Response.json({ data, emailDelivery }, { headers: noStore })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
