import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_ROLE, normalizeRole } from '@/shared/auth/permissions'
import requireModule from '@/shared/db/requireAccess/requireModule'
import ssrClient from '@/shared/db/requireAccess/ssrClient'

const datePattern = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const dateIsValid = (value: string) => datePattern.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value

export async function GET(req: NextRequest) {
  const session = await requireModule('tasks')
  if (!session.ok) return NextResponse.json({ error: session.error }, { status: session.status })
  const params = req.nextUrl.searchParams
  const start = params.get('start') || ''
  const end = params.get('end') || ''
  if (!dateIsValid(start) || !dateIsValid(end) || start > end ||
      (Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000 > 42) {
    return NextResponse.json({ error: 'Período inválido.' }, { status: 400 })
  }
  const project = params.get('project') || ''
  const company = params.get('company') || ''
  const member = params.get('member') || ''
  const status = params.get('status') || ''
  if ((project && !uuidPattern.test(project)) || (member && !uuidPattern.test(member)) || company.length > 80 || status.length > 80) {
    return NextResponse.json({ error: 'Filtro inválido.' }, { status: 400 })
  }
  const db = ssrClient() // Caller session; all SELECTs retain RLS.
  const { data: profile } = await db.from('usuarios').select('id,rol,activo').eq('auth_id', session.userId).maybeSingle()
  if (!profile?.activo) return NextResponse.json({ error: 'Perfil no disponible.' }, { status: 403 })
  const isAdmin = normalizeRole(profile.rol) === ADMIN_ROLE
  if (member && !isAdmin) return NextResponse.json({ error: 'Filtro de miembro no disponible.' }, { status: 403 })
  if (project) {
    const { data: accessible } = await db.from('projects').select('id').eq('id', project).maybeSingle()
    if (!accessible) return NextResponse.json({ error: 'Proyecto no disponible.' }, { status: 404 })
  }

  // Page within the visible DATE interval. PostgREST may cap a response at 1,000 rows.
  const tasks: Record<string, unknown>[] = []
  for (let offset = 0; ; offset += 500) {
    const responsibleEmbed = 'actividad_responsables!actividad_responsables_actividad_id_fkey(usuario_id,es_lider)'
    const memberMatch = member ? ',matched:actividad_responsables!actividad_responsables_actividad_id_fkey!inner(usuario_id)' : ''
    let query = db.from('actividades').select(`id,titulo,empresa,estado,fecha_entrega,project_id,${responsibleEmbed}${memberMatch}`).gte('fecha_entrega', start).lte('fecha_entrega', end)
      .order('fecha_entrega').order('id').range(offset, offset + 499)
    if (project) query = query.eq('project_id', project)
    if (company) query = query.eq('empresa', company)
    if (member) query = query.eq('matched.usuario_id', member)
    if (status) query = query.eq('estado', status)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'No se pudieron cargar las tareas.' }, { status: 500 })
    const rows = (data || []) as unknown as (Record<string, unknown> & { actividad_responsables?: { usuario_id: string; es_lider: boolean }[] })[]
    tasks.push(...rows.map(({ actividad_responsables, matched: _matched, ...task }) => ({ ...task, responsables: actividad_responsables || [] })))
    if (!data || data.length < 500) break
  }

  // Project dates are discrete markers, never synthetic Tasks.
  let markerQuery = db.from('projects').select('id,name,company_code,start_date,target_date')
    .or(`and(start_date.gte.${start},start_date.lte.${end}),and(target_date.gte.${start},target_date.lte.${end})`)
  if (project) markerQuery = markerQuery.eq('id', project)
  if (company) markerQuery = markerQuery.eq('company_code', company)
  const { data: markers, error: markerError } = await markerQuery
  if (markerError) return NextResponse.json({ error: 'No se pudieron cargar los proyectos.' }, { status: 500 })
  return NextResponse.json({ tasks, markers: markers || [] }, { headers: { 'Cache-Control': 'private, no-store' } })
}
