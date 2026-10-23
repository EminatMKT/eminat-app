import { z } from 'zod'
import requireAdmin from '@/shared/db/requireAdmin'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
const noStore = { 'Cache-Control': 'no-store' }
const querySchema = z.object({ organizationId:z.string().uuid(),userId:z.string().uuid() })

/** Read-only, admin-scoped history for one user in one Sales organization. */
export async function GET(request:Request) {
  const access = await requireAdmin()
  if (!access.ok) return Response.json({ code:'ADMIN_REQUIRED' },
    { status:access.status,headers:noStore })
  const url = new URL(request.url)
  const query = querySchema.safeParse({
    organizationId:url.searchParams.get('organizationId'),
    userId:url.searchParams.get('userId'),
  })
  if (!query.success) return Response.json({ code:'INVALID_HISTORY_FILTER' },
    { status:422,headers:noStore })

  const db = supabaseAdmin({ noStore:true })
  const { organizationId,userId } = query.data
  const [{ data:member,error:memberError },{ data:target,error:targetError }] = await Promise.all([
    db.from('sales_members').select('id').eq('organization_id',organizationId)
      .eq('user_id',userId).maybeSingle(),
    db.from('usuarios').select('id').eq('id',userId).maybeSingle(),
  ])
  if (memberError || targetError) return Response.json({ code:'SELLER_HISTORY_UNAVAILABLE' },
    { status:503,headers:noStore })
  if (!target) return Response.json({ code:'SELLER_IDENTITY_NOT_FOUND' },
    { status:404,headers:noStore })

  const [accessEvents,validationEvents] = await Promise.all([
    member ? db.from('sales_history')
      .select('id,action,occurred_at,changes,request_id')
      .eq('organization_id',organizationId).eq('entity_type','sales_member')
      .eq('record_id',member.id)
      .in('action',['seller_access_granted','seller_access_revoked'])
      .order('occurred_at',{ ascending:false }).limit(100)
      : Promise.resolve({ data:[],error:null }),
    db.from('historial').select('id,accion,created_at,valor_anterior,valor_nuevo,usuario_id')
      .eq('tabla','usuarios').eq('registro_id',userId)
      .in('accion',['validated','activated'])
      .order('created_at',{ ascending:false }).limit(100),
  ])
  if (accessEvents.error || validationEvents.error)
    return Response.json({ code:'SELLER_HISTORY_UNAVAILABLE' },
      { status:503,headers:noStore })

  const events = [
    ...(accessEvents.data ?? []).map(row => ({
      id:row.id,action:row.action,at:row.occurred_at,
      actorUserId:typeof row.changes?.actorUserId==='string' ? row.changes.actorUserId : null,
      previousState:typeof row.changes?.previousStatus==='string' ? row.changes.previousStatus :
        row.action==='seller_access_revoked' ? 'active' : 'unknown',
      newState:typeof row.changes?.newStatus==='string' ? row.changes.newStatus :
        typeof row.changes?.status==='string' ? row.changes.status : 'unknown',
    })),
    ...(validationEvents.data ?? []).map(row => ({
      id:row.id,action:row.accion,at:row.created_at,actorUserId:row.usuario_id,
      previousState:row.valor_anterior ?? 'unknown',newState:row.valor_nuevo ?? 'unknown',
    })),
  ].sort((a,b) => b.at.localeCompare(a.at))
  return Response.json({ events },{ headers:noStore })
}
