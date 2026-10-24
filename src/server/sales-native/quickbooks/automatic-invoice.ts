import 'server-only'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { sendPatientInvoice } from '@/server/sales-native/patient-email-delivery'
import { quoteMembership, type MembershipType, type Plan,
  type SaleDuration } from '@/server/sales-native/pricing'
import { connectedQboReadAccess, EMC_ORGANIZATION_ID } from './connection'
import type { QboInvoice, QboRecoveryInvoice } from './client'
import { patientProfileReadyForPayment } from './patient-profile'

type Job = {
  id: string; organization_id: string; enrollment_intent_id: string;
  patient_identity_id: string; contact_id: string; opportunity_id: string;
  plan: Plan; membership_type: MembershipType; duration: SaleDuration;
  amount_cents: number; state: string; qbo_customer_id: string | null;
  qbo_invoice_id: string | null; qbo_invoice_number: string | null;
  created_at: string;
}
const invoiceLink = (value: unknown): value is string => typeof value === 'string' &&
  /^https:\/\/connect\.intuit\.com\/t\/[^\s]+$/.test(value) && value.length <= 2048

export function qboProductName(job: Pick<Job,'plan'|'membership_type'|'duration'>) {
  const type = job.membership_type === 'FAMILY' ? 'Family' : 'Individual'
  const duration = ({ MONTHLY:'Month-to-Month','3M':'3 Months',
    '6M':'6 Months','12M':'12 Months' } as const)[job.duration]
  if (!duration) throw new Error('QBO_PRODUCT_MAPPING_REQUIRED')
  return `Corazón Salud - ${job.plan[0]}${job.plan.slice(1).toLowerCase()} - ${type} - ${duration}`
}

function verifyInvoice(invoice: QboInvoice | QboRecoveryInvoice, job: Job,
  customerId: string, itemId: string) {
  if (invoice.CustomerRef.value !== customerId ||
    Math.round(invoice.TotalAmt*100) !== job.amount_cents ||
    Math.round(invoice.Balance*100) !== job.amount_cents ||
    (invoice.TxnTaxDetail?.TotalTax ?? 0) !== 0 ||
    !invoice.Line?.some(line => line.DetailType === 'SalesItemLineDetail' &&
      line.SalesItemLineDetail?.ItemRef.value === itemId &&
      line.SalesItemLineDetail.Qty === 1 &&
      Math.round(line.Amount*100) === job.amount_cents))
    throw new Error('QBO_INVOICE_MISMATCH')
}

/** Patient-initiated issuance. Every external POST has a durable pre-write state.
 * An ambiguous provider response is never retried by this path. */
export async function issuePatientQboInvoice(identityId: string, intentId: string,
  authenticatedEmail: string) {
  const db = supabaseAdmin({ noStore:true })
  // Do not create a durable invoice job (which locks selection edits) for an
  // incomplete profile. Existing jobs must still be recoverable after deploy.
  const { data: existingJob, error: existingJobError } = await db
    .from('sales_qbo_invoice_jobs').select('id')
    .eq('organization_id',EMC_ORGANIZATION_ID).eq('patient_identity_id',identityId)
    .eq('enrollment_intent_id',intentId).maybeSingle()
  if (existingJobError) throw new Error('QBO_INVOICE_JOB_UNAVAILABLE')
  if (!existingJob) {
    const { data: identity, error: identityError } = await db.from('sales_patient_identities')
      .select('contact_id').eq('organization_id',EMC_ORGANIZATION_ID)
      .eq('id',identityId).maybeSingle()
    if (identityError || !identity?.contact_id) throw new Error('QBO_IDENTITY_UNAVAILABLE')
    const { data: profile, error: profileError } = await db.from('sales_contacts')
      .select('first_name,last_name,email,phone,address').eq('organization_id',EMC_ORGANIZATION_ID)
      .eq('id',identity.contact_id).maybeSingle()
    if (profileError || !profile || profile.email?.toLowerCase() !== authenticatedEmail.toLowerCase())
      throw new Error('QBO_CONTACT_MISMATCH')
    if (!patientProfileReadyForPayment(profile))
      throw new Error('PATIENT_PROFILE_COMPLETION_REQUIRED')
  }
  const { data: claimed, error: claimError } = await db.rpc('native_sales_qbo_claim_invoice', {
    p_identity_id:identityId,p_intent_id:intentId,
  })
  const job = (Array.isArray(claimed) ? claimed[0] : null) as Job | null
  if (claimError || !job || job.organization_id !== EMC_ORGANIZATION_ID ||
    job.patient_identity_id !== identityId) throw new Error('QBO_INVOICE_CLAIM_FAILED')
  if (job.state === 'LINKED') return { status:'INVOICE_CREATED' as const,
    invoiceNumber:job.qbo_invoice_number }
  if (!['CLAIMED','INVOICE_CREATED','INVOICE_WRITE_STARTED'].includes(job.state))
    return { status:'PENDING_RECONCILIATION' as const }
  const quote = quoteMembership(job.plan,job.membership_type,job.duration)
  if (quote.totalCents !== job.amount_cents) throw new Error('QBO_INVOICE_AMOUNT_MISMATCH')
  const { data: contact, error: contactError } = await db.from('sales_contacts')
    .select('id,first_name,last_name,display_name,email,phone,address,do_not_email')
    .eq('organization_id',EMC_ORGANIZATION_ID).eq('id',job.contact_id).maybeSingle()
  if (contactError || !contact || !contact.email ||
    contact.email.toLowerCase() !== authenticatedEmail.toLowerCase() ||
    !contact.first_name || !contact.last_name) throw new Error('QBO_CONTACT_MISMATCH')
  if (job.state === 'CLAIMED' && !patientProfileReadyForPayment(contact))
    throw new Error('PATIENT_PROFILE_COMPLETION_REQUIRED')
  if (job.state === 'CLAIMED') {
    const { data: locked, error: lockError } = await db.from('sales_qbo_invoice_jobs')
      .update({ state:'PRECHECKING',updated_at:new Date().toISOString() })
      .eq('id',job.id).eq('state','CLAIMED').select('id').maybeSingle()
    if (lockError || !locked) return { status:'PENDING_RECONCILIATION' as const }
  }

  const { client,realmId,accessToken } = await connectedQboReadAccess()
  const company = await client.companyInfo(realmId,accessToken)
  if (![company.name,company.legalName].some(name =>
    name?.trim().toLowerCase() === 'eminat medical center llc'))
    throw new Error('QBO_COMPANY_MISMATCH')
  const item = await client.itemByName(realmId,accessToken,qboProductName(job))
  if (item.Taxable === true) throw new Error('QBO_ITEM_TAX_MISMATCH')
  if (job.state === 'INVOICE_WRITE_STARTED') {
    if (!job.qbo_customer_id) throw new Error('QBO_INVOICE_RECOVERY_REQUIRED')
    const { data: events, error: eventsError } = await db.from('sales_qbo_webhook_events')
      .select('entity_id').eq('organization_id',EMC_ORGANIZATION_ID)
      .eq('environment','production').eq('realm_id',realmId)
      .eq('entity_type','Invoice').eq('operation','Create')
      .gte('created_at',job.created_at).order('created_at',{ ascending:true }).limit(100)
    if (eventsError) throw new Error('QBO_INVOICE_RECOVERY_EVENTS_UNAVAILABLE')
    const matches: QboRecoveryInvoice[] = []
    for (const event of events ?? []) {
      const invoice = await client.invoiceForRecovery(realmId,accessToken,event.entity_id)
      if (invoice.PrivateNote !== `LILLY enrollment ${job.enrollment_intent_id}`) continue
      verifyInvoice(invoice,job,job.qbo_customer_id,item.Id)
      matches.push(invoice)
      if (matches.length > 1) break
    }
    if (!matches.length) return { status:'PENDING_RECONCILIATION' as const }
    if (matches.length !== 1) throw new Error('QBO_INVOICE_RECOVERY_AMBIGUOUS')
    const recovered = await client.numberExistingInvoice(realmId,accessToken,
      matches[0],job.enrollment_intent_id)
    verifyInvoice(recovered,job,job.qbo_customer_id,item.Id)
    const { data: recoveredJob, error: recoveryError } = await db
      .from('sales_qbo_invoice_jobs').update({ state:'INVOICE_CREATED',
        qbo_invoice_id:recovered.Id,qbo_invoice_number:recovered.DocNumber,
        updated_at:new Date().toISOString() })
      .eq('id',job.id).eq('state','INVOICE_WRITE_STARTED').select('id').maybeSingle()
    if (recoveryError || !recoveredJob) throw new Error('QBO_INVOICE_RECOVERY_STATE_CONFLICT')
    job.state = 'INVOICE_CREATED'
    job.qbo_invoice_id = recovered.Id
    job.qbo_invoice_number = recovered.DocNumber
  }
  if (job.state === 'INVOICE_CREATED') {
    if (!job.qbo_customer_id || !job.qbo_invoice_id || !job.qbo_invoice_number)
      throw new Error('QBO_INVOICE_RECOVERY_REQUIRED')
    const invoice = await client.invoiceWithLink(realmId,accessToken,job.qbo_invoice_id)
    verifyInvoice(invoice,job,job.qbo_customer_id,item.Id)
    if (!invoiceLink(invoice.InvoiceLink)) throw new Error('QBO_HOSTED_PAYMENT_UNAVAILABLE')
    const { error } = await db.rpc('native_sales_qbo_finish_invoice', {
      p_job_id:job.id,p_customer_id:job.qbo_customer_id,p_item_id:item.Id,
      p_invoice_id:job.qbo_invoice_id,p_invoice_number:job.qbo_invoice_number,
      p_hosted_url:invoice.InvoiceLink,
    })
    if (error) throw new Error('QBO_INVOICE_LINK_FAILED')
    if (!contact.do_not_email)
      await sendPatientInvoice(job.enrollment_intent_id,authenticatedEmail,job.qbo_invoice_number)
    return { status:'INVOICE_CREATED' as const,invoiceNumber:job.qbo_invoice_number }
  }
  const { data: existingBinding, error: bindingError } = await db
    .from('sales_qbo_customer_bindings').select('qbo_customer_id')
    .eq('organization_id',EMC_ORGANIZATION_ID).eq('contact_id',job.contact_id).maybeSingle()
  if (bindingError) throw new Error('QBO_CUSTOMER_BINDING_UNAVAILABLE')
  let customerId = existingBinding?.qbo_customer_id as string | undefined
  if (customerId) {
    const boundCustomer = await client.customer(realmId,customerId,accessToken)
    if (boundCustomer.Active === false ||
      boundCustomer.PrimaryEmailAddr?.Address.toLowerCase() !== authenticatedEmail.toLowerCase())
      throw new Error('QBO_CUSTOMER_BINDING_MISMATCH')
  }
  if (!customerId) {
    const customers = await client.customersByEmail(realmId,accessToken,authenticatedEmail)
    if (customers.length > 1) throw new Error('QBO_CUSTOMER_DUPLICATE_REVIEW')
    if (customers.length === 1) {
      if (customers[0].Active === false) throw new Error('QBO_CUSTOMER_INACTIVE')
      customerId = customers[0].Id
    } else {
      const { data: started, error: startError } = await db.from('sales_qbo_invoice_jobs')
        .update({ state:'CUSTOMER_WRITE_STARTED',updated_at:new Date().toISOString() })
        .eq('id',job.id).eq('state','PRECHECKING').select('id').maybeSingle()
      if (startError || !started) throw new Error('QBO_CUSTOMER_WRITE_LOCK_FAILED')
      const created = await client.createCustomer(realmId,accessToken,{
        displayName:`${contact.first_name} ${contact.last_name} · ${job.contact_id.slice(0,8)}`,
        firstName:contact.first_name,lastName:contact.last_name,email:authenticatedEmail,
      })
      if (created.PrimaryEmailAddr?.Address.toLowerCase() !== authenticatedEmail.toLowerCase())
        throw new Error('QBO_CUSTOMER_MISMATCH')
      customerId = created.Id
    }
    const { error: insertError } = await db.from('sales_qbo_customer_bindings').insert({
      organization_id:EMC_ORGANIZATION_ID,contact_id:job.contact_id,qbo_customer_id:customerId,
    })
    if (insertError) throw new Error('QBO_CUSTOMER_BINDING_CONFLICT')
  }
  const { data: customerLocked, error: customerLockError } = await db
    .from('sales_qbo_invoice_jobs').update({ state:'CUSTOMER_LINKED',
      qbo_customer_id:customerId,updated_at:new Date().toISOString() })
    .eq('id',job.id).in('state',['PRECHECKING','CUSTOMER_WRITE_STARTED'])
    .select('id').maybeSingle()
  if (customerLockError || !customerLocked) throw new Error('QBO_CUSTOMER_STATE_CONFLICT')
  const { data: invoiceLocked, error: invoiceLockError } = await db
    .from('sales_qbo_invoice_jobs').update({ state:'INVOICE_WRITE_STARTED',
      updated_at:new Date().toISOString() })
    .eq('id',job.id).eq('state','CUSTOMER_LINKED').select('id').maybeSingle()
  if (invoiceLockError || !invoiceLocked) throw new Error('QBO_INVOICE_WRITE_LOCK_FAILED')
  const createdInvoice = await client.createInvoice(realmId,accessToken,{
    customerId,itemId:item.Id,email:authenticatedEmail,amountCents:job.amount_cents,
    intentId:job.enrollment_intent_id,
  })
  verifyInvoice(createdInvoice,job,customerId,item.Id)
  const { error: invoiceStateError } = await db.from('sales_qbo_invoice_jobs')
    .update({ state:'INVOICE_CREATED',qbo_invoice_id:createdInvoice.Id,
      qbo_invoice_number:createdInvoice.DocNumber,updated_at:new Date().toISOString() })
    .eq('id',job.id).eq('state','INVOICE_WRITE_STARTED')
  if (invoiceStateError) throw new Error('QBO_INVOICE_PERSIST_FAILED')
  const linkedInvoice = await client.invoiceWithLink(realmId,accessToken,createdInvoice.Id)
  verifyInvoice(linkedInvoice,job,customerId,item.Id)
  if (!invoiceLink(linkedInvoice.InvoiceLink))
    throw new Error('QBO_HOSTED_PAYMENT_UNAVAILABLE')
  const { error: finishError } = await db.rpc('native_sales_qbo_finish_invoice', {
    p_job_id:job.id,p_customer_id:customerId,p_item_id:item.Id,
    p_invoice_id:createdInvoice.Id,p_invoice_number:createdInvoice.DocNumber,
    p_hosted_url:linkedInvoice.InvoiceLink,
  })
  if (finishError) throw new Error('QBO_INVOICE_LINK_FAILED')
  if (!contact.do_not_email)
    await sendPatientInvoice(job.enrollment_intent_id,authenticatedEmail,createdInvoice.DocNumber)
  return { status:'INVOICE_CREATED' as const,invoiceNumber:createdInvoice.DocNumber }
}
