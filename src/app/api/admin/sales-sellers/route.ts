import { z } from 'zod'
import requireAdmin from '@/shared/db/requireAdmin'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
const noStore = { 'Cache-Control': 'no-store' }
const inputSchema = z.object({
  userId:z.string().uuid(),organizationId:z.string().uuid(),active:z.boolean(),
}).strict()

export async function GET() {
  const access = await requireAdmin()
  if (!access.ok) return Response.json({ code:'ADMIN_REQUIRED' },
    { status:access.status,headers:noStore })
  const db = supabaseAdmin({ noStore:true })
  const [organizations,users,members] = await Promise.all([
    db.from('sales_organizations').select('id,name,status').eq('status','active'),
    db.from('usuarios').select('id,nombre,apellido,email,auth_id,activo,validado')
      .not('auth_id','is',null).order('nombre'),
    db.from('sales_members').select('id,organization_id,user_id,role,status,display_name')
      .neq('status','historical'),
  ])
  if (organizations.error || users.error || members.error)
    return Response.json({ code:'SALES_SELLER_DIRECTORY_UNAVAILABLE' },
      { status:503,headers:noStore })
  return Response.json({ organizations:organizations.data,users:users.data,
    members:members.data },{ headers:noStore })
}

export async function POST(request: Request) {
  const access = await requireAdmin()
  if (!access.ok) return Response.json({ code:'ADMIN_REQUIRED' },
    { status:access.status,headers:noStore })
  const body = await request.json().catch(() => null)
  const input = inputSchema.safeParse(body)
  if (!input.success) return Response.json({ code:'INVALID_SELLER_REQUEST' },
    { status:422,headers:noStore })
  const { data,error } = await supabaseAdmin({ noStore:true })
    .rpc('native_sales_admin_set_seller',{
      p_actor_user_id:access.userId,p_target_user_id:input.data.userId,
      p_organization_id:input.data.organizationId,p_active:input.data.active,
    })
  if (error) {
    const rejected = error.code === '42501' || error.code === '22023' || error.code === 'P0002'
    return Response.json({ code:rejected ? error.message : 'SALES_SELLER_UPDATE_UNAVAILABLE' },
      { status:rejected ? 422 : 503,headers:noStore })
  }
  return Response.json({ member:{ id:data.id,organizationId:data.organization_id,
    userId:data.user_id,role:data.role,status:data.status } },{ headers:noStore })
}
