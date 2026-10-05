import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import requireModule from '@/shared/db/requireAccess/requireModule'
import ssrClient from '@/shared/db/requireAccess/ssrClient'
import dispatchTaskAssignmentEmails from '@/features/tasks/server/notifications'

const taskPayload = z.object({
  titulo: z.string().trim().min(1), empresa: z.string().min(1),
  responsable_id: z.string().uuid(), fecha_inicio: z.string(), estado: z.string(),
  mes: z.string().nullable(), trimestre: z.string().nullable(),
  descripcion: z.string().nullable(), horas: z.number().nullable(),
  dias_produccion: z.number().nullable(), fecha_entrega: z.string().nullable(),
  solicitante_id: z.string().uuid().nullable(), drive_url: z.string().nullable(),
})
const requestSchema = z.object({
  requestId: z.string().uuid(), id: z.string().uuid().optional(),
  expectedUpdatedAt: z.string().optional(), payload: taskPayload,
})

export async function POST(req: NextRequest) {
  const authz = await requireModule('tasks')
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })
  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Datos de tarea inválidos.' }, { status: 400 })
  const { id, requestId, expectedUpdatedAt, payload } = parsed.data
  const db = ssrClient()
  if (id && !expectedUpdatedAt) return NextResponse.json({ error: 'Falta versión de la tarea.' }, { status: 400 })
  const { data: assignee } = await db.from('usuarios').select('id,rol,activo').eq('id', payload.responsable_id).maybeSingle()
  if (!assignee?.activo) return NextResponse.json({ error: 'Responsable no disponible.' }, { status: 422 })
  if (assignee.rol !== 'admin') {
    const { data: grants } = await db.from('role_modules').select('role_key').eq('role_key', assignee.rol).eq('module_slug', 'tasks')
    if (!grants?.length) return NextResponse.json({ error: 'El responsable no tiene acceso a Tasks.' }, { status: 422 })
  }
  let task: Record<string, unknown> | null = null
  if (id) {
    const { data, error } = await db.from('actividades').update(payload)
      .eq('id', id).eq('updated_at', expectedUpdatedAt).select().maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data) {
      const { data: current } = await db.from('actividades').select('*').eq('id', id).maybeSingle()
      return NextResponse.json({ conflict: true, current }, { status: 409 })
    }
    task = data
  } else {
    const { data: prior } = await db.from('actividades').select('*').eq('assignment_request_id', requestId).maybeSingle()
    if (prior) task = prior
    else {
      const { data: actor } = await db.from('usuarios').select('id').eq('auth_id', authz.userId).maybeSingle()
      const { data, error } = await db.from('actividades').insert({
        ...payload, created_by_id: actor?.id || null, assignment_request_id: requestId,
      }).select().single()
      if (error) {
        if (error.code === '23505') {
          const { data: replay } = await db.from('actividades').select('*').eq('assignment_request_id', requestId).maybeSingle()
          if (replay) task = replay
        }
        if (!task) return NextResponse.json({ error: error.message }, { status: 400 })
      } else task = data
    }
  }
  const delivery = await dispatchTaskAssignmentEmails(String(task.id))
    .catch(() => ({ warning: 'Tarea guardada; entrega de correo pendiente de revisión.' }))
  return NextResponse.json({ data: task, warning: delivery.warning })
}
