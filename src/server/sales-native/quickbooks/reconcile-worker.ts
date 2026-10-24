import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { sendPatientActivation } from '@/server/sales-native/patient-email-delivery'
import { connectedQboReadAccess, EMC_ORGANIZATION_ID } from './connection'
import { decideQboPayment, invoiceIdsForPayment,
  patientInvoiceMappingValid } from './reconciliation'
import type { QboInvoice } from './client'
import { patientAddressText, patientProfileReadyForPayment } from './patient-profile'

const FALLBACK_MEMBER_ID = 'c67e9779-9e87-48b0-9f6c-bf6a0c8cebad'
const db = () => supabaseAdmin({ noStore: true })
type Event = { id: string; organization_id: string; environment: string;
  realm_id: string; entity_type: string; entity_id: string;
  operation: string; attempts: number }

async function history(organizationId: string, recordId: string, action: string,
  changes: Record<string, unknown>): Promise<void> {
  const { error } = await db().from('sales_history').insert({
    organization_id: organizationId, entity_type: 'qbo_reconciliation',
    record_id: recordId, action, request_id: randomUUID(), changes,
  })
  if (error) throw new Error('QBO_AUDIT_UNAVAILABLE')
}

async function activateVerifiedIntent(intentId: string): Promise<'ACTIVE' | 'PENDING_PROFILE' | 'ALREADY_ACTIVE'> {
  const client = db()
  const { data: intent, error: intentError } = await client.from('sales_patient_enrollment_intents')
    .select('id,organization_id,patient_identity_id,opportunity_id,plan,membership_type,duration,membership_id')
    .eq('organization_id',EMC_ORGANIZATION_ID).eq('id',intentId).maybeSingle()
  if (intentError || !intent) throw new Error('QBO_INTENT_UNAVAILABLE')
  if (intent.membership_id) return 'ALREADY_ACTIVE'
  const { data: evidence, error: evidenceError } = await client.from('sales_patient_qbo_manual')
    .select('sales_payment_id,verification_state,finance_verification_status,qbo_payment_status,qa_synthetic')
    .eq('organization_id',EMC_ORGANIZATION_ID).eq('enrollment_intent_id',intentId).maybeSingle()
  if (evidenceError || !evidence || evidence.qa_synthetic || !evidence.sales_payment_id ||
    evidence.verification_state !== 'PAYMENT_VERIFIED' || evidence.finance_verification_status !== 'VERIFIED' ||
    !['PAID','VERIFIED'].includes(evidence.qbo_payment_status))
    throw new Error('QBO_PAYMENT_NOT_VERIFIED')
  const { data: identity, error: identityError } = await client.from('sales_patient_identities')
    .select('contact_id').eq('organization_id',EMC_ORGANIZATION_ID)
    .eq('id',intent.patient_identity_id).maybeSingle()
  if (identityError || !identity?.contact_id) throw new Error('QBO_IDENTITY_UNAVAILABLE')
  const { data: contact, error: contactError } = await client.from('sales_contacts')
    .select('id,first_name,last_name,email,phone,address,do_not_email')
    .eq('organization_id',EMC_ORGANIZATION_ID).eq('id',identity.contact_id)
    .is('archived_at',null).maybeSingle()
  if (contactError || !contact) throw new Error('QBO_CONTACT_UNAVAILABLE')
  const address = patientAddressText(contact.address)
  if (!patientProfileReadyForPayment(contact) || !address) return 'PENDING_PROFILE'
  // The provider-confirmed payment date is stable across retries and midnight.
  // A fresh clock date would change the membership idempotency payload.
  const { data: payment, error: paymentError } = await client.from('sales_payments')
    .select('paid_at').eq('organization_id',EMC_ORGANIZATION_ID)
    .eq('id',evidence.sales_payment_id).maybeSingle()
  if (paymentError || !payment?.paid_at) throw new Error('QBO_PAYMENT_DATE_UNAVAILABLE')
  const issuedAt = payment.paid_at
  const fields = [evidence.sales_payment_id,contact.id,intent.plan,intent.membership_type,
    intent.duration,issuedAt,contact.first_name,contact.last_name,contact.phone,contact.email,address,false]
  const hash = createHash('sha256').update(JSON.stringify(fields)).digest('hex')
  const { error } = await client.rpc('native_sales_issue_membership', {
    p_organization_id: EMC_ORGANIZATION_ID,p_actor_member_id: FALLBACK_MEMBER_ID,
    p_payment_id:evidence.sales_payment_id,p_contact_id:contact.id,
    p_plan:intent.plan,p_membership_type:intent.membership_type,p_duration:intent.duration,
    p_issued_at:issuedAt,p_first_name:contact.first_name,p_last_name:contact.last_name,
    p_phone:contact.phone,p_email:contact.email,p_address:address,p_is_demo:false,
    p_idempotency_key:`patient-qbo-${intentId}`,p_payload_hash:hash,p_request_id:randomUUID(),
  })
  if (error) throw new Error('QBO_ACTIVATION_UNAVAILABLE')
  const { data: activated } = await client.from('sales_patient_enrollment_intents')
    .select('membership_id').eq('organization_id',EMC_ORGANIZATION_ID).eq('id',intentId).maybeSingle()
  if (!activated?.membership_id) throw new Error('QBO_ACTIVATION_UNCONFIRMED')
  await history(EMC_ORGANIZATION_ID,intentId,'qbo_automatic_membership_activated',
    { membershipId:activated.membership_id })
  if (!contact.do_not_email) {
    const email = await sendPatientActivation(activated.membership_id,contact.email,contact.first_name)
    if (email.status === 'FAILED' || email.status === 'NOT_CONFIGURED')
      throw new Error('QBO_ACTIVATION_EMAIL_RETRY_REQUIRED')
  }
  return 'ACTIVE'
}

async function reconcileInvoice(event: Event, invoice: QboInvoice,
  access: Awaited<ReturnType<typeof connectedQboReadAccess>>): Promise<'PROCESSED' | 'RETRY' | 'IGNORED'> {
  const client = db()
  const { data: matches, error: matchError } = await client.from('sales_patient_qbo_manual')
    .select('id,organization_id,enrollment_intent_id,opportunity_id,sales_payment_id,base_invoice_amount_cents,qa_synthetic,qbo_invoice_number,qbo_invoice_reference,qbo_customer_reference,qbo_item_reference,qbo_invoice_status,verification_state,membership_activation_status')
    .eq('organization_id',event.organization_id).eq('qbo_invoice_reference',invoice.Id)
    .eq('qa_synthetic',false).limit(2)
  if (matchError) throw new Error('QBO_MAPPING_UNAVAILABLE')
  if (!matches?.length) {
    await history(event.organization_id,event.id,'qbo_invoice_unmatched',
      { invoiceId:invoice.Id, attempt:event.attempts })
    return event.attempts < 12 ? 'RETRY' : 'IGNORED'
  }
  if (matches.length !== 1) {
    await history(event.organization_id,event.id,'qbo_invoice_ambiguous',{ invoiceId:invoice.Id })
    return 'IGNORED'
  }
  const mapping = matches[0]
  if (!mapping.qbo_customer_reference || !mapping.qbo_item_reference ||
    !['OPEN','PAID'].includes(mapping.qbo_invoice_status)) {
    await history(event.organization_id,event.id,'qbo_customer_mapping_missing',{ invoiceId:invoice.Id })
    return 'IGNORED'
  }
  const { data: intent, error: intentError } = await client.from('sales_patient_enrollment_intents')
    .select('id,organization_id,patient_identity_id,opportunity_id,amount_cents,membership_id')
    .eq('organization_id',event.organization_id).eq('id',mapping.enrollment_intent_id).maybeSingle()
  const { data: opportunity, error: opportunityError } = await client.from('sales_opportunities')
    .select('id,organization_id,primary_contact_id,amount,currency')
    .eq('organization_id',event.organization_id).eq('id',mapping.opportunity_id).maybeSingle()
  if (intentError || opportunityError || !intent || !opportunity) {
    await history(event.organization_id,event.id,'qbo_business_mapping_mismatch',{ invoiceId:invoice.Id })
    return 'IGNORED'
  }
  const { data: identity, error: identityError } = await client.from('sales_patient_identities')
    .select('id,organization_id,contact_id').eq('organization_id',event.organization_id)
    .eq('id',intent.patient_identity_id).maybeSingle()
  if (identityError || !identity || !patientInvoiceMappingValid({
    organizationId:event.organization_id,mapping,intent,opportunity,identity,
  })) {
    await history(event.organization_id,event.id,'qbo_patient_mapping_mismatch',{ invoiceId:invoice.Id })
    return 'IGNORED'
  }
  const paymentIds = Array.from(new Set((invoice.LinkedTxn ?? [])
    .filter(link => link.TxnType === 'Payment').map(link => link.TxnId)))
  const payments = await Promise.all(paymentIds.map(id =>
    access.client.payment(access.realmId,id,access.accessToken)))
  const decision = decideQboPayment({ invoice,payments,invoiceId:invoice.Id,
    invoiceNumber:mapping.qbo_invoice_number,customerId:mapping.qbo_customer_reference,
    itemId:mapping.qbo_item_reference,
    amountCents:mapping.base_invoice_amount_cents,
    alreadyActive:!!intent.membership_id || mapping.membership_activation_status === 'ACTIVE' })
  if (decision.status === 'REVIEW' && decision.reason === 'ALREADY_ACTIVE' && intent.membership_id) {
    // Activation may have committed before email queuing or audit failed. The
    // outbox uses membershipId as its idempotency key, so this cannot resend a
    // previously accepted activation email or issue another membership.
    const { data: contact, error: contactError } = await client.from('sales_contacts')
      .select('first_name,email,do_not_email').eq('organization_id',event.organization_id)
      .eq('id',identity.contact_id).maybeSingle()
    if (contactError || !contact?.first_name || !contact.email)
      throw new Error('QBO_ACTIVATION_CONTACT_UNAVAILABLE')
    if (!contact.do_not_email) {
      const email = await sendPatientActivation(intent.membership_id,contact.email,contact.first_name)
      if (email.status === 'FAILED' || email.status === 'NOT_CONFIGURED') {
        await history(event.organization_id,event.id,'qbo_activation_email_retry',
          { invoiceId:invoice.Id,membershipId:intent.membership_id })
        return 'RETRY'
      }
    }
    await history(event.organization_id,event.id,'qbo_already_active',
      { invoiceId:invoice.Id,membershipId:intent.membership_id })
    return 'PROCESSED'
  }
  if (decision.status !== 'PAID') {
    await history(event.organization_id,event.id,`qbo_${decision.status.toLowerCase()}`,
      { invoiceId:invoice.Id, reason:decision.reason })
    return decision.status === 'RETRY' || decision.status === 'PENDING' && event.attempts < 12
      ? 'RETRY' : 'PROCESSED'
  }
  if (mapping.verification_state !== 'PAYMENT_VERIFIED') {
    const { error: verifyError } = await client.rpc('native_sales_patient_qbo_update', {
      p_intent_id:intent.id,p_actor_member_id:FALLBACK_MEMBER_ID,p_action:'VERIFY_PAYMENT',
      p_payment_reference:decision.reference,p_payment_confirmed_at:decision.paidAt,
      p_qa_synthetic:false,
    })
    if (verifyError) {
      const { data: current } = await client.from('sales_patient_qbo_manual')
        .select('verification_state').eq('organization_id',event.organization_id)
        .eq('id',mapping.id).maybeSingle()
      if (current?.verification_state !== 'PAYMENT_VERIFIED') throw new Error('QBO_VERIFICATION_UNAVAILABLE')
    } else await history(event.organization_id,event.id,'qbo_provider_payment_verified',
      { invoiceId:invoice.Id,paymentIds:decision.paymentIds,intentId:intent.id })
  }
  const { data: evidence, error: evidenceError } = await client.from('sales_patient_qbo_manual')
    .select('sales_payment_id,verification_state').eq('organization_id',event.organization_id)
    .eq('id',mapping.id).maybeSingle()
  if (evidenceError || evidence?.verification_state !== 'PAYMENT_VERIFIED' ||
    !evidence.sales_payment_id) throw new Error('QBO_VERIFICATION_UNCONFIRMED')
  const { data: recorded, error: recordedError } = await client.from('sales_payments')
    .select('reference').eq('organization_id',event.organization_id)
    .eq('id',evidence.sales_payment_id).maybeSingle()
  if (recordedError || !recorded || recorded.reference !== decision.reference) {
    await history(event.organization_id,event.id,'qbo_payment_reference_changed',
      { invoiceId:invoice.Id })
    return 'PROCESSED'
  }
  // Re-read the provider invoice immediately before activation; a reversed payment must not activate.
  const latestInvoice = await access.client.invoice(access.realmId,invoice.Id,access.accessToken)
  const latestPayments = await Promise.all(Array.from(new Set((latestInvoice.LinkedTxn ?? [])
    .filter(link => link.TxnType === 'Payment').map(link => link.TxnId)))
    .map(id => access.client.payment(access.realmId,id,access.accessToken)))
  const latest = decideQboPayment({ invoice:latestInvoice,payments:latestPayments,
    invoiceId:invoice.Id,invoiceNumber:mapping.qbo_invoice_number,
    customerId:mapping.qbo_customer_reference,itemId:mapping.qbo_item_reference,
    amountCents:mapping.base_invoice_amount_cents,
    alreadyActive:false })
  if (latest.status !== 'PAID') {
    await history(event.organization_id,event.id,'qbo_activation_held',
      { invoiceId:invoice.Id,reason:latest.reason })
    return 'PROCESSED'
  }
  const activation = await activateVerifiedIntent(intent.id)
  if (activation === 'PENDING_PROFILE')
    await history(event.organization_id,event.id,'qbo_activation_pending_profile',
      { invoiceId:invoice.Id,intentId:intent.id })
  return activation === 'PENDING_PROFILE' ? 'RETRY' : 'PROCESSED'
}

async function processEvent(event: Event,
  access: Awaited<ReturnType<typeof connectedQboReadAccess>>): Promise<'PROCESSED' | 'RETRY' | 'IGNORED'> {
  if (event.organization_id !== EMC_ORGANIZATION_ID || event.environment !== 'production' ||
    event.realm_id !== access.realmId) {
    await history(event.organization_id,event.id,'qbo_realm_mismatch',{ realmId:event.realm_id })
    return 'IGNORED'
  }
  if (event.operation.toLowerCase() === 'delete') {
    await history(event.organization_id,event.id,'qbo_deleted_entity_requires_review',
      { entityType:event.entity_type,entityId:event.entity_id })
    return 'IGNORED'
  }
  if (event.entity_type === 'Invoice') {
    const invoice = await access.client.invoice(access.realmId,event.entity_id,access.accessToken)
    return reconcileInvoice(event,invoice,access)
  }
  if (event.entity_type === 'Payment') {
    const payment = await access.client.payment(access.realmId,event.entity_id,access.accessToken)
    const invoiceIds = invoiceIdsForPayment(payment)
    if (invoiceIds.length !== 1) {
      await history(event.organization_id,event.id,'qbo_payment_ambiguous',
        { paymentId:event.entity_id,invoiceCount:invoiceIds.length })
      return invoiceIds.length ? 'IGNORED' : 'RETRY'
    }
    const invoice = await access.client.invoice(access.realmId,invoiceIds[0],access.accessToken)
    return reconcileInvoice(event,invoice,access)
  }
  return 'IGNORED'
}

/** Cron-only queue processor. No webhook payload is trusted as proof of payment. */
export async function reconcileQboEvents(): Promise<{ processed: number; retry: number; ignored: number }> {
  const access = await connectedQboReadAccess()
  const client = db()
  const now = new Date().toISOString()
  const { data: events, error } = await client.from('sales_qbo_webhook_events')
    .select('id,organization_id,environment,realm_id,entity_type,entity_id,operation,attempts')
    .eq('organization_id',EMC_ORGANIZATION_ID).eq('environment','production')
    .in('status',['PENDING','RETRY']).lte('next_attempt_at',now)
    .order('created_at',{ ascending:true }).limit(20)
  if (error) throw new Error('QBO_QUEUE_UNAVAILABLE')
  const counts = { processed:0,retry:0,ignored:0 }
  for (const event of (events ?? []) as Event[]) {
    const { data: claimed, error: claimError } = await client.from('sales_qbo_webhook_events')
      .update({ attempts:event.attempts+1,
        next_attempt_at:new Date(Date.now()+120_000).toISOString(),status:'RETRY' })
      .eq('id',event.id).eq('attempts',event.attempts).in('status',['PENDING','RETRY'])
      .lte('next_attempt_at',now).select('id').maybeSingle()
    if (claimError) throw new Error('QBO_QUEUE_CLAIM_UNAVAILABLE')
    if (!claimed) continue
    let result: 'PROCESSED' | 'RETRY' | 'IGNORED' = 'RETRY'
    try { result = await processEvent({ ...event,attempts:event.attempts+1 },access) }
    catch {
      result = 'RETRY'
      await history(event.organization_id,event.id,'qbo_processing_retry',
        { entityType:event.entity_type,entityId:event.entity_id,attempt:event.attempts+1 })
    }
    const delay = Math.min(3600,2 ** Math.min(event.attempts+1,10) * 30)
    const { error: finishError } = await client.from('sales_qbo_webhook_events')
      .update({ status:result,processed_at:result === 'RETRY' ? null : new Date().toISOString(),
        next_attempt_at:new Date(Date.now()+delay*1000).toISOString() }).eq('id',event.id)
      .eq('attempts',event.attempts+1)
    if (finishError) throw new Error('QBO_QUEUE_UPDATE_UNAVAILABLE')
    if (result === 'PROCESSED') counts.processed++
    else if (result === 'IGNORED') counts.ignored++
    else counts.retry++
  }
  return counts
}
