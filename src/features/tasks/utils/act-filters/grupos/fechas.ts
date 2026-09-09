import { enRango, type FilterDef } from '@/shared/utils'
import type { Actividad } from '@/features/tasks/types'

/** Las dos fechas de una actividad, cada una por rango y con el nombre de SU columna. Un solo
 *  control rotulado «Fecha» no diría de cuál habla, y cuál importa depende de lo que se
 *  pregunte: cuándo se empezó o cuándo vence. */
export default function filtrosFechas(): FilterDef<Actividad>[] {
  return [
    { key: 'fecha_inicio', labelKey: 'stratix.detail.start', nameKey: 'stratix.detail.start',
      kind: 'dateRange', match: (a, v) => enRango(v, a.fecha_inicio) },
    { key: 'fecha_entrega', labelKey: 'stratix.col.due', nameKey: 'stratix.col.due',
      kind: 'dateRange', match: (a, v) => enRango(v, a.fecha_entrega) },
  ]
}
