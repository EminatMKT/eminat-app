import { grupoAsignacion } from './grupos/asignacion'
import { grupoPeriodo } from './grupos/periodo'
import { grupoEsfuerzo } from './grupos/esfuerzo'
import { grupoFechas } from './grupos/fechas'
import { grupoAprobacion } from './grupos/aprobacion'
import type { Actividad } from '@/features/stratix-mkt/types'
import type { Deps, GrupoCampos } from './tipos'

export type { Deps, DetalleCampo, GrupoCampos } from './tipos'
export { fechaLarga } from './fecha'
export { rastroDeActividad } from './rastro'

// Las filas de la ficha, AGRUPADAS por lo que significan. Quince pares sueltos se leen como
// una tabla de propiedades: hay que recorrerla entera para encontrar uno. Agrupados, la vista
// salta primero al grupo y después al dato.
export function camposDeActividad(a: Actividad, deps: Deps): GrupoCampos[] {
  const grupos = [
    grupoAsignacion(a, deps),
    grupoPeriodo(a, deps),
    grupoEsfuerzo(a, deps),
    grupoFechas(a, deps),
    grupoAprobacion(a, deps),
  ]
  return grupos
}
