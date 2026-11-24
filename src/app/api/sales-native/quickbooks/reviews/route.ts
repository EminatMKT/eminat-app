import { patientQboActor } from '@/server/sales-native/patient-qbo-auth'
import { qboEnvironment } from '@/server/sales-native/quickbooks/environment'
import { EMC_ORGANIZATION_ID } from '@/server/sales-native/quickbooks/connection'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'no-store'}

/** Read-only finance review queue. No resolution, payment approval or membership action. */
export async function GET(request:Request){
  try{
    const actor=await patientQboActor(request)
    if(!actor?.verifier)return Response.json({code:'PAYMENT_REVIEW_FORBIDDEN'},{status:403,headers})
    const params=new URL(request.url).searchParams
    const offset=Number(params.get('offset')??0)
    if([...params.keys()].some(key=>key!=='offset') || !Number.isSafeInteger(offset) || offset<0 || offset>100000)
      return Response.json({code:'INVALID_FILTER'},{status:422,headers})
    const db=supabaseAdmin({noStore:true})
    const {data:events,error}=await db.from('sales_qbo_webhook_events')
      .select('id,entity_type,entity_id,operation,attempts,review_reason,review_required_at')
      .eq('organization_id',EMC_ORGANIZATION_ID).eq('environment',qboEnvironment())
      .eq('status','MANUAL_REVIEW').order('review_required_at',{ascending:false}).order('id',{ascending:false})
      .range(offset,offset+49)
    if(error)throw new Error('QBO_REVIEW_READ_FAILED')
    const rows=events??[]
    const audit=rows.length?await db.from('sales_history').select('record_id,changes,occurred_at')
      .eq('organization_id',EMC_ORGANIZATION_ID).eq('entity_type','qbo_reconciliation')
      .eq('action','qbo_manual_review_required').in('record_id',rows.map(row=>row.id))
      :{data:[],error:null}
    if(audit.error)throw new Error('QBO_REVIEW_AUDIT_READ_FAILED')
    return Response.json({data:rows.map(row=>({...row,audit:(audit.data??[]).filter(item=>item.record_id===row.id)})),offset},{headers})
  }catch{return Response.json({code:'QBO_REVIEWS_UNAVAILABLE'},{status:503,headers})}
}
