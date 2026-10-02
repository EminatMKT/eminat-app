import { ESTADO } from '@/shared/constants/domain'
import { periodoLargo } from '@/features/tasks/utils/periodo'
import responsables from '@/features/tasks/utils/responsables'
import usersFromNames from '@/features/tasks/utils/responsables/names'
import type { Actividad } from '@/features/tasks/types'

const EMPTY_LABEL = '—'

export type DatosTarjeta = {
  inicial: string
  entrega: string
  vencida: boolean
  /** El período de imputación, corto: "ago 2026". Vacío si la tarea no tiene fecha. */
  periodo: string
  /** Leader (or first alphabetically) plus how many more: `Ana Bravo +2`, or `—`. */
  responsable: { label: string; lider: boolean }
}

// Lo que la tarjeta del Kanban muestra, decidido acá y no en el JSX: "vencida" es una regla de
// negocio (la entrega pasó Y la tarea no está completada), no un detalle de estilo, y así se
// prueba sin montar nada.
// La fecha se arma en hora LOCAL — sin el 'T00:00:00' se lee en UTC y después de las 20:00
// muestra el día siguiente (ver rules/codigo.md).
// El parámetro se llama `intlLocale` y no `locale` porque es el BCP-47 que come `Intl` —'es-EC',
// no 'es'—. El nombre viejo invitaba a pasarle el `locale` de `useT()`, que es lo que hacía la
// tarjeta: el mismo `locale === 'en' ? …` que `shared/i18n` existe para que nadie repita.
export function datosTarjeta(a: Actividad, namesById: Record<string, string>, intlLocale: string, hoy = new Date()): DatosTarjeta {
  const vencida = !!a.fecha_entrega && new Date(a.fecha_entrega + 'T00:00:00') < hoy && a.estado !== ESTADO.COMPLETADO
  const entrega = a.fecha_entrega
    ? new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString(intlLocale, { day: 'numeric', month: 'short' })
    : ''
  // Vacío y no '—' cuando falta: acá el período va detrás de un separador que también desaparece,
  // así que el hueco lo decide el JSX. En la ficha, donde el campo tiene rótulo, sí va el guion.
  const periodo = a.fecha_inicio ? periodoLargo(a.fecha_inicio, intlLocale, 'short') : ''
  const responsable = responsables.etiquetaResponsablesCompacta(a, usersFromNames(namesById))
  const initial = responsable.label === EMPTY_LABEL ? '?' : responsable.label[0]
  const datos = { inicial: initial, entrega, vencida, periodo, responsable }
  return datos
}
