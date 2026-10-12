import type { CanonicalTaskListItem } from './types'

/** Presentation-only search; never changes the authorized source rows. */
export function matchesMeetingSearch(query: string, values: Array<string | null | undefined>) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim()
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  const text = normalize(values.filter(Boolean).join(' '))
  return terms.every((term) => text.includes(term))
}

export function matchesTaskSearch(task: CanonicalTaskListItem, query: string) {
  return matchesMeetingSearch(query, [task.titulo, task.descripcion, task.responsable?.nombre,
    task.empresa, task.meeting?.company, task.meeting?.title, task.equipo?.nombre, task.departamento?.nombre])
}
