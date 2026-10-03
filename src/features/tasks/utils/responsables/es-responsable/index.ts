import type { ResponsiblesInput } from '@/features/tasks/types'

/** Whether a person is one of the task's responsables; an empty id is nobody. */
export default function esResponsable(act: ResponsiblesInput, usuarioId: string | null | undefined): boolean {
  if (!usuarioId) return false
  return (act.responsables ?? []).some(responsible => responsible.usuario_id === usuarioId)
}

// The empty-id guard matters: a member row without id must not match a task whose list holds a
// null or blank id, which would put someone else's work on their pay sheet.
