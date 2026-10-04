// Decide si una actividad entra en el reporte de un miembro.
//
// Report incluye sólo las tareas asignadas a la persona seleccionada.
import { claveMes } from '@/features/tasks/utils/periodo'

export type ActividadRef = {
  responsable_id?: string | null
  fecha_inicio?: string | null
}

// `mes` es la clave 'YYYY-MM', no la etiqueta. Antes era `act.mes === 'Agosto'` sobre una columna
// de texto sin año, así que el reporte de un mes sumaba ese mes de TODOS los años: en enero de
// 2027 el reporte de Enero habría incluido enero de 2026. El año va en la clave.
export function esActividadDeMiembro(act: ActividadRef, idMiembro: string, mes?: string): boolean {
  if (!idMiembro) return false
  const suya = act.responsable_id === idMiembro
  if (!suya) return false
  return mes ? claveMes(act.fecha_inicio) === mes : true
}
