import { z } from 'zod'

const uuid = z.string().uuid()
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const nullableText = z.string().trim().max(10000).nullable().optional()

export const createMeetTaskSchema = z.object({
  topic_id: uuid,
  titulo: z.string().trim().min(1).max(500),
  descripcion: nullableText,
  responsable_id: uuid,
  fecha_inicio: date,
  fecha_entrega: date.nullable().optional(),
  empresa: z.string().trim().min(1).max(100),
}).strict()

export const updateMeetTaskSchema = z.object({
  expected_updated_at: z.string().datetime({ offset: true }),
  titulo: z.string().trim().min(1).max(500).optional(),
  descripcion: nullableText,
  responsable_id: uuid.optional(),
  fecha_entrega: date.nullable().optional(),
  empresa: z.string().trim().min(1).max(100).optional(),
}).strict().refine(
  ({ expected_updated_at: _expected, ...changes }) => Object.keys(changes).length > 0,
  { message: 'Debe enviar al menos un campo para actualizar.' },
)

export type CreateMeetTaskInput = z.infer<typeof createMeetTaskSchema>
export type UpdateMeetTaskInput = z.infer<typeof updateMeetTaskSchema>

export type CanonicalMeetTask = {
  id: string
  titulo: string
  descripcion: string | null
  responsable_id: string
  estado: string
  fecha_inicio: string
  fecha_entrega: string | null
  empresa: string
  updated_at: string
  responsable: { id: string; nombre: string } | null
  equipo: { id: string; codigo: string; nombre: string } | null
  departamento: { id: string; codigo: string; nombre: string } | null
}

export type CanonicalMeetTaskListItem = CanonicalMeetTask & {
  meeting: { id: string; title: string; company: string | null } | null
}

export type CanonicalMeetTaskList = {
  tasks: CanonicalMeetTaskListItem[]
  viewer: {
    profile_id: string
    equipo: { id: string; nombre: string } | null
    empresa: { id: string; codigo: string; nombre: string } | null
  }
}
