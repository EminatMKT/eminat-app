// Decide si una actividad entra en el reporte de un miembro.
//
// Report incluye sólo las tareas asignadas a la persona seleccionada. "Asignada" es ser
// cualquiera de los responsables de la tarea: una tarea con A y B entra en la hoja de A y
// en la de B (spec 2026-10-01, "Payroll").
import { claveMes } from '@/features/tasks/utils/periodo'
import { esResponsable } from '@/features/tasks/utils/responsables'
import type { ResponsiblesInput } from '@/features/tasks/types'

export type ActividadRef = ResponsiblesInput & {
  fecha_inicio?: string | null
}

// `mes` es la clave 'YYYY-MM', no la etiqueta. Antes era `act.mes === 'Agosto'` sobre una columna
// de texto sin año, así que el reporte de un mes sumaba ese mes de TODOS los años: en enero de
// 2027 el reporte de Enero habría incluido enero de 2026. El año va en la clave.
export function esActividadDeMiembro(act: ActividadRef, idMiembro: string, mes?: string): boolean {
  if (!idMiembro) return false
  const suya = esResponsable(act, idMiembro)
  if (!suya) return false
  return mes ? claveMes(act.fecha_inicio) === mes : true
}
