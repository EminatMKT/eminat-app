import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic='force-dynamic'
const roles=z.array(z.enum(['SUPERADMIN','ADMINISTRATOR','SALES_MANAGER']))
  .min(1).max(3).refine(items => new Set(items).size===items.length)
const setting=z.object({
  cadence:z.enum(['DAILY','WEEKLY']),recipientRoles:roles,enabled:z.boolean(),
}).strict()
const update=setting.extend({id:z.uuid(),version:z.number().int().positive()}).strict()

export async function GET(request:Request) {
  try {
    if (new URL(request.url).searchParams.size)
      return Response.json({code:'INVALID_FILTER'},{status:422})
    const actor=await resolveSalesActor(request)
    const {data,error}=await supabaseAdmin().rpc('native_sales_report_schedules',{
      p_organization_id:actor.organizationId,p_actor_member_id:actor.memberId,
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({data:data ?? []},{headers:{'Cache-Control':'no-store'}})
  } catch (error) { return nativeSalesErrorResponse(error) }
}

async function save(request:Request,edit:boolean) {
  try {
    const actor=await resolveSalesActor(request)
    if (Number(request.headers.get('content-length') ?? '0')>4096)
      return Response.json({code:'BODY_TOO_LARGE'},{status:413})
    let payload:unknown
    try {payload=await request.json()} catch {return Response.json({code:'INVALID_JSON'},{status:400})}
    if (Buffer.byteLength(JSON.stringify(payload))>4096)
      return Response.json({code:'BODY_TOO_LARGE'},{status:413})
    const parsed=(edit?update:setting).safeParse(payload)
    if (!parsed.success) return Response.json({code:'VALIDATION_ERROR'},{status:422})
    const body=parsed.data
    const {data,error}=await supabaseAdmin().rpc('native_sales_save_report_schedule',{
      p_organization_id:actor.organizationId,p_actor_member_id:actor.memberId,
      p_schedule_id:'id' in body ? body.id : null,
      p_expected_version:'version' in body ? body.version : null,
      p_cadence:body.cadence,p_recipient_roles:body.recipientRoles,
      p_enabled:body.enabled,p_request_id:randomUUID(),
    })
    if (error) return nativeSalesDatabaseError(error)
    return Response.json({data},{status:edit?200:201,headers:{'Cache-Control':'no-store'}})
  } catch (error) { return nativeSalesErrorResponse(error) }
}
export async function POST(request:Request) { return save(request,false) }
export async function PATCH(request:Request) { return save(request,true) }
