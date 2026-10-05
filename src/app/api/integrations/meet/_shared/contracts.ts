import { z } from 'zod'
import validateResponsibles from './responsibles/validate'
import type { CanonicalMeetResponsible } from './responsibles/types'

const uuid = z.string().uuid()
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const nullableText = z.string().trim().max(10000).nullable().optional()
const responsibleFields = {
  responsable_id: uuid.optional(),
  responsable_ids: z.array(uuid).max(50).optional(),
  lider_id: uuid.nullable().optional(),
}
const NO_CHANGES_ISSUE = { message: 'Send at least one field to update.' }
// `expected_updated_at` is required, so any key beyond it is a change.
const hasChanges = (input: object) => Object.keys(input).length > 1

export const createMeetTaskSchema = z.object({
  topic_id: uuid,
  titulo: z.string().trim().min(1).max(500),
  descripcion: nullableText,
  ...responsibleFields,
  fecha_inicio: date,
  fecha_entrega: date.nullable().optional(),
  empresa: z.string().trim().min(1).max(100),
}).strict().superRefine(validateResponsibles.create)

export const updateMeetTaskSchema = z.object({
  expected_updated_at: z.string().datetime({ offset: true }),
  titulo: z.string().trim().min(1).max(500).optional(),
  descripcion: nullableText,
  ...responsibleFields,
  fecha_entrega: date.nullable().optional(),
  empresa: z.string().trim().min(1).max(100).optional(),
}).strict().refine(hasChanges, NO_CHANGES_ISSUE).superRefine(validateResponsibles.update)

export type CreateMeetTaskInput = z.infer<typeof createMeetTaskSchema>
export type UpdateMeetTaskInput = z.infer<typeof updateMeetTaskSchema>

export type CanonicalMeetTask = {
  id: string
  titulo: string
  descripcion: string | null
  /** Legacy: the principal (leader, else first alphabetically); the full set is `responsables`. */
  responsable_id: string | null
  responsables: CanonicalMeetResponsible[]
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
