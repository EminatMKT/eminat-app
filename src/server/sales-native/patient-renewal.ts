import 'server-only'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { EMC_ORGANIZATION_ID } from './quickbooks/connection'

/** Caller supplies the authenticated Patient identity, never a browser-selected organization. */
export async function readPatientRenewals(identity: { id: string; contact_id: string; organization_id: string }) {
  if (identity.organization_id !== EMC_ORGANIZATION_ID) throw new Error('PATIENT_RENEWAL_FORBIDDEN')
  const db = supabaseAdmin({ noStore:true })
  const { data: membership, error } = await db.from('sales_memberships')
    .select('id,code,plan,membership_type,duration,status,issued_at,expires_at,is_demo')
    .eq('organization_id',identity.organization_id).eq('primary_contact_id',identity.contact_id)
    .eq('is_demo',false).order('created_at',{ ascending:false }).limit(1).maybeSingle()
  if (error) throw new Error('RENEWAL_UNAVAILABLE')
  if (!membership) return { membership:null,eligible:false,eligibleFrom:null,renewals:[] }
  const { data: intents, error: intentError } = await db.from('sales_patient_enrollment_intents')
    .select('id,plan,membership_type,duration,amount_cents,status,initial_months,renewal_base_expires_at,renewal_starts_at,renewal_expires_at,renewed_at,created_at')
    .eq('organization_id',identity.organization_id).eq('patient_identity_id',identity.id)
    .eq('renewal_membership_id',membership.id).eq('purpose','RENEWAL')
    .order('created_at',{ ascending:false }).limit(100)
  if (intentError) throw new Error('RENEWAL_UNAVAILABLE')
  const renewals = await Promise.all((intents ?? []).map(async intent => {
    const [{ data:qbo,error:qboError },{ data:agreement,error:agreementError },{ data:job,error:jobError }] = await Promise.all([
      db.from('sales_patient_qbo_manual').select('qbo_invoice_number,qbo_hosted_payment_url,qbo_invoice_status,qbo_payment_status,verification_state,membership_activation_status')
        .eq('organization_id',identity.organization_id).eq('enrollment_intent_id',intent.id).maybeSingle(),
      db.rpc('native_sales_patient_invoice_agreement_valid',{ p_intent_id:intent.id }),
      db.from('sales_qbo_invoice_jobs').select('state').eq('organization_id',identity.organization_id).eq('enrollment_intent_id',intent.id).maybeSingle(),
    ])
    if (qboError || agreementError || jobError) throw new Error('RENEWAL_UNAVAILABLE')
    return { ...intent,agreementSatisfied:agreement === true,invoiceJobState:job?.state ?? null,qbo }
  }))
  const eligibleFrom = new Date(`${membership.expires_at}T00:00:00Z`)
  eligibleFrom.setUTCDate(eligibleFrom.getUTCDate()-30)
  const today = new Intl.DateTimeFormat('en-CA',{ timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date())
  return { membership,eligibleFrom:eligibleFrom.toISOString().slice(0,10),
    eligible:['ACTIVE','EXPIRED'].includes(membership.status) && today >= eligibleFrom.toISOString().slice(0,10),
    renewals }
}
