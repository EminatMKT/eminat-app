import 'server-only'
import type { NextRequest } from 'next/server'
import { ADMIN_ROLE, normalizeRole } from '@/shared/auth/permissions'
import requireModule from '@/shared/db/requireAccess/requireModule'
import ssrClient from '@/shared/db/requireAccess/ssrClient'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export type ReportMetrics = { totalTasks: number; completedTasks: number; totalHours: number; completionRate: number; productionDays?: number }
export type ReportData = {
  memberId: string; name: string; month: string
  tasks: { id: string; titulo: string; descripcion: string; empresa: string; fecha_inicio: string; fecha_entrega: string; horas?: number; dias_produccion?: number; assignedEmployees?: { id: string; name: string; leader: boolean }[]; estado: string }[]
  members: { id: string; name: string }[]; canSelectEmployees: boolean; metrics?: ReportMetrics
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const failure = (status: number, error: string) => ({ status, error })
type Profile = { id: string; auth_id?: string; rol?: string; activo?: boolean; empresa_id: string | null; nombre: string; apellido: string }
const name = (person: Profile) => [person.nombre, person.apellido].filter(Boolean).join(' ')

type ReadResult = { status: number; error: string; data?: never } | { status: number; data: ReportData; error?: never }
export async function readProductionReport(req: NextRequest): Promise<ReadResult> {
  const session = await requireModule('tasks')
  if (!session.ok) return failure(session.status, session.error)
  const requested = req.nextUrl.searchParams.get('user') || null
  const month = req.nextUrl.searchParams.get('month') || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit' }).slice(0, 7)
  if ((requested && !uuid.test(requested)) || !/^[1-9][0-9]{3}-(0[1-9]|1[0-2])$/.test(month))
    return failure(400, 'Usuario o período inválido.')
  try {
    // All operational data reads use the caller's session and existing RLS. Never use
    // the privileged membership client to read tasks, employees or company/project grants.
    const db = ssrClient()
    const { data: actor, error: profileError } = await db.from('usuarios')
      .select('id,auth_id,rol,activo,empresa_id,nombre,apellido').eq('auth_id', session.userId).maybeSingle()
    if (profileError) return failure(503, 'No se pudo verificar el perfil.')
    if (!actor?.activo || actor.auth_id !== session.userId) return failure(403, 'Perfil no disponible.')

    // Existing Sales membership tables are server-only in the production baseline.
    // This client performs exactly one identity-bound SELECT, never operational queries.
    const { data: memberships, error: membershipError } = await supabaseAdmin({ noStore: true }).from('sales_members')
      .select('user_id,auth_id,role,status,sales_organizations!inner(code,status)')
      .eq('user_id', actor.id).eq('auth_id', session.userId).eq('status', 'active')
      .eq('sales_organizations.code', 'stratix').eq('sales_organizations.status', 'active')
    if (membershipError) return failure(503, 'No se pudo verificar el permiso del reporte.')
    const showMetrics = (memberships ?? []).some(row => {
      const org = Array.isArray(row.sales_organizations) ? row.sales_organizations[0] : row.sales_organizations
      return row.user_id === actor.id && row.auth_id === session.userId && row.status === 'active'
        && row.role === 'SUPERADMIN' && org?.code === 'stratix' && org.status === 'active'
    })
    const canSelectEmployees = normalizeRole(actor.rol) === ADMIN_ROLE || showMetrics
    const memberId = requested || actor.id
    if (!canSelectEmployees && memberId !== actor.id) return failure(403, 'Sólo puedes consultar tu reporte.')
    // SUPERADMIN retains the original authenticated/RLS reporting scope. The
    // company's employment affiliation must not narrow supervised/delegated work.
    const grants = await db.from('usuario_empresas_acceso').select('empresa_codigo').eq('usuario_id', actor.id)
    const projects = await db.from('project_members').select('project_id').eq('user_id', actor.id)
    const company = actor.empresa_id ? await db.from('empresas').select('codigo').eq('id', actor.empresa_id).maybeSingle() : { data: null, error: null }
    if (grants.error || projects.error || company.error) return failure(503, 'No se pudo verificar el alcance del reporte.')
    const codes: string[] = Array.from(new Set([...(grants.data ?? []).map(row => row.empresa_codigo), ...(company.data?.codigo ? [company.data.codigo] : [])]))
    const projectIds: string[] = Array.from(new Set((projects.data ?? []).map(row => row.project_id)))
    if (!showMetrics && !codes.length && !projectIds.length) return failure(403, 'El reporte requiere un alcance de empresa o proyecto autorizado.')

    // Resolve assignee names with the same authenticated client, including historical
    // inactive employees. Only active authorized profiles remain selectable.
    const profiles: Profile[] = []
    for (let offset = 0; ; offset += 500) {
      const peers = await db.from('usuarios').select('id,empresa_id,nombre,apellido,activo').order('id').range(offset, offset + 499).returns<Profile[]>()
      if (peers.error || !peers.data) return failure(503, 'No se pudo verificar los miembros del reporte.')
      profiles.push(...peers.data)
      if (peers.data.length < 500) break
      if (offset >= 99500) return failure(503, 'El reporte supera el tamaño permitido.')
    }
    let members: ReportData['members'] = [{ id: actor.id, name: name(actor) }]
    if (canSelectEmployees) {
      const companyPeers = codes.length ? await db.from('usuario_empresas_acceso').select('usuario_id').in('empresa_codigo', codes).limit(1001) : { data: [], error: null }
      const projectPeers = projectIds.length ? await db.from('project_members').select('user_id').in('project_id', projectIds).limit(1001) : { data: [], error: null }
      if (companyPeers.error || projectPeers.error || [companyPeers, projectPeers].some(result => (result.data?.length ?? 0) > 1000))
        return failure(503, 'No se pudo verificar los miembros del reporte.')
      const permitted = new Set([actor.id, ...(companyPeers.data ?? []).map(row => row.usuario_id), ...(projectPeers.data ?? []).map(row => row.user_id)])
      members = profiles.filter(person => person.activo && (permitted.has(person.id) || (actor.empresa_id && person.empresa_id === actor.empresa_id)))
        .map(person => ({ id: person.id, name: name(person) }))
    }
    if (!members.some(person => person.id === memberId)) return failure(403, 'No tienes permiso para consultar este reporte.')
    const people = new Map(profiles.map(person => [person.id, name(person)]))
    const [year, number] = month.split('-').map(Number)
    const end = new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 10)

    // Read all normalized assignments for the target; do not require an INNER
    // join that would discard legacy primary-assignee or requester-only tasks.
    const assignedIds: string[] = []
    for (let offset = 0; ; offset += 500) {
      const assignments = await db.from('actividad_responsables').select('actividad_id').eq('usuario_id', memberId)
        .order('actividad_id').range(offset, offset + 499)
      if (assignments.error || !assignments.data) return failure(503, 'No se pudo cargar el reporte.')
      assignedIds.push(...assignments.data.map(row => row.actividad_id))
      if (assignments.data.length < 500) break
      if (offset >= 99500) return failure(503, 'El reporte supera el tamaño permitido.')
    }
    type Row = ReportData['tasks'][number]
    type StoredRow = Row & { responsable_id: string | null; actividad_responsables: { usuario_id: string; es_lider: boolean }[] }
    const fields = `id,titulo,descripcion,empresa,estado,fecha_inicio,fecha_entrega,responsable_id${showMetrics ? ',horas,dias_produccion' : ''},actividad_responsables!actividad_responsables_actividad_id_fkey(usuario_id,es_lider)`
    const selections: { column: string; values: string[]; many: boolean }[] = [{ column: 'responsable_id', values: [memberId], many: false }]
    for (let i = 0; i < assignedIds.length; i += 100) selections.push({ column: 'id', values: assignedIds.slice(i, i + 100), many: true })
    // Historical SUPERADMIN report: the work I execute OR the work I requested.
    // This restores delegated team work without granting any new database access.
    if (showMetrics) selections.push({ column: 'solicitante_id', values: [memberId], many: false })
    const scopes: { column: string; values: string[] }[] = showMetrics ? [{ column: '', values: [] }] :
      [{ column: 'empresa', values: codes }, { column: 'project_id', values: projectIds }].filter(scope => scope.values.length)
    const rows = new Map<string, Row>()
    const creditedTo = new Map<string, string | undefined>()
    for (const scope of scopes) for (const selection of selections) {
      for (let offset = 0; ; offset += 500) {
        let query = db.from('actividades').select(fields)
        if (scope.column) query = query.in(scope.column, scope.values)
        query = selection.many ? query.in(selection.column, selection.values) : query.eq(selection.column, selection.values[0])
        const result = await query.gte('fecha_inicio', `${month}-01`).lt('fecha_inicio', end)
          .order('fecha_inicio', { ascending: false }).order('id').range(offset, offset + 499).returns<StoredRow[]>()
        if (result.error || !result.data) return failure(503, 'No se pudo cargar el reporte.')
        for (const task of result.data) {
          const normalized = task.actividad_responsables ?? []
          // Normalized assignments are authoritative when present. A stale legacy
          // primary field must never give an employee another person's work.
          if (selection.column !== 'solicitante_id' && normalized.length && !normalized.some(person => person.usuario_id === memberId)) continue
          const assignments = new Map(normalized.map(person => [person.usuario_id, person.es_lider]))
          if (task.responsable_id && !assignments.size) assignments.set(task.responsable_id, true)
          const assignedEmployees = Array.from(assignments, ([id, leader]) => ({ id, name: people.get(id) || '—', leader }))
            .sort((a, b) => Number(b.leader) - Number(a.leader) || a.name.localeCompare(b.name, 'es'))
          creditedTo.set(task.id, (task.responsable_id && assignments.has(task.responsable_id) ? task.responsable_id : undefined) || assignedEmployees.find(person => person.leader)?.id || (assignedEmployees.length === 1 ? assignedEmployees[0].id : undefined))
          rows.set(task.id, { id: task.id, titulo: task.titulo, descripcion: task.descripcion, empresa: task.empresa,
            estado: task.estado, fecha_inicio: task.fecha_inicio, fecha_entrega: task.fecha_entrega, assignedEmployees,
            ...(showMetrics ? { horas: task.horas, dias_produccion: task.dias_produccion } : {}) })
        }
        if (result.data.length < 500) break
        if (offset >= 99500) return failure(503, 'El reporte supera el tamaño permitido.')
      }
    }
    const tasks = Array.from(rows.values()).sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio) || a.id.localeCompare(b.id))
    const completed = tasks.filter(task => task.estado === 'Completado').length
    // Preserve the original payment totals: delegated work is listed but its
    // hours/days are credited once, to its executor, not to its requester.
    const executed = tasks.filter(task => creditedTo.get(task.id) === memberId)
    const data: ReportData = { memberId, name: members.find(person => person.id === memberId)!.name, month,
      tasks, members, canSelectEmployees, ...(showMetrics ? { metrics: { totalTasks: tasks.length, completedTasks: completed,
        totalHours: Math.round(executed.reduce((sum, task) => sum + Number(task.horas ?? 0), 0) * 10) / 10,
        productionDays: executed.reduce((sum, task) => sum + Number(task.dias_produccion ?? 0), 0),
        completionRate: tasks.length ? Math.round(completed / tasks.length * 1000) / 10 : 0 } } : {}) }
    return { status: 200, data }
  } catch {
    return failure(503, 'No se pudo cargar el reporte.')
  }
}
