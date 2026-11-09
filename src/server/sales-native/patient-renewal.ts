import 'server-only'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { EMC_ORGANIZATION_ID } from './quickbooks/connection'

/** Identity comes from the validated patient session, never a browser-selected organization. */
export async function readPatientRenewals(identity: { id:string;organization_id:string }, offset=0) {
  if (identity.organization_id !== EMC_ORGANIZATION_ID) throw new Error('PATIENT_RENEWAL_FORBIDDEN')
  if (!Number.isSafeInteger(offset) || offset<0 || offset>100000) throw new Error('INVALID_FILTER')
  const {data,error} = await supabaseAdmin({noStore:true}).rpc('native_sales_patient_renewal_summary',{
    p_identity_id:identity.id,p_limit:25,p_offset:offset,
  })
  if (error || !data) throw new Error('RENEWAL_UNAVAILABLE')
  return data
}
