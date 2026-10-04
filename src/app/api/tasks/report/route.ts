import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_ROLE, normalizeRole } from '@/shared/auth/permissions'
import { requireModule, ssrClient } from '@/shared/db/requireAccess'

const workerColumns = 'id,titulo,empresa,estado,fecha_inicio,fecha_entrega'
const adminColumns = `${workerColumns},responsable_id`

export async function GET(req: NextRequest) {
  const session = await requireModule('tasks')
  if (!session.ok) return NextResponse.json({ error: session.error }, { status: session.status })
  const db = ssrClient()
  const { data: profile, error: profileError } = await db.from('usuarios')
    .select('id,rol,activo').eq('auth_id', session.userId).maybeSingle()
  if (profileError || !profile?.activo) return NextResponse.json({ error: 'Perfil no disponible.' }, { status: 403 })
  const admin = normalizeRole(profile.rol) === ADMIN_ROLE
  const requestedUser = req.nextUrl.searchParams.get('user') || profile.id
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(requestedUser)) {
    return NextResponse.json({ error: 'Usuario inválido.' }, { status: 400 })
  }
  if (!admin && requestedUser !== profile.id) {
    return NextResponse.json({ error: 'Sólo puedes consultar tu reporte.' }, { status: 403 })
  }
  const month = req.nextUrl.searchParams.get('month')
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json({ error: 'Período inválido.' }, { status: 400 })
  }
  let query = db.from('actividades').select(admin ? adminColumns : workerColumns)
    .eq('responsable_id', requestedUser).order('fecha_inicio', { ascending: false })
  if (month) {
    const [year, number] = month.split('-').map(Number)
    const next = new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 10)
    query = query.gte('fecha_inicio', `${month}-01`).lt('fecha_inicio', next)
  }
  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'No se pudo cargar el reporte.' }, { status: 500 })
  return NextResponse.json({ tasks: data || [], scope: admin ? 'admin' : 'self' },
    { headers: { 'Cache-Control': 'private, no-store' } })
}
