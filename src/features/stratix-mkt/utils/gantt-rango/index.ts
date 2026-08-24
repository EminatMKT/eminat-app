// Eje temporal del Gantt. Vive acá y no en el componente porque decide CUÁNTOS
// nodos se renderizan: es la diferencia entre 30 días y 664.781.
//
// El 24/08/2026 seis filas con `fecha_entrega = '0206-03-23'` (typo de "2026")
// estiraron el eje del año 206 al 2026 y congelaron la app: 1,1 GB de heap y
// 119 s de main thread bloqueado. El `|| hoy` que había antes no protegía nada,
// porque sólo cubría el array vacío y cualquier Date —incluso el del año 206— es
// truthy.

const DIA_MS = 86400000
const MIN_DIAS = 7
const DIAS_POR_DEFECTO = 31
// Techo duro del eje. Es una red independiente del filtro de años de abajo: si la
// heurística deja pasar algo, el número de <DayHeader/> sigue acotado.
export const MAX_DIAS = 1830 // ~5 años
// Ventana aceptable alrededor de hoy. Fuera de esto la fecha es un error de carga,
// no un dato: no existe una tarea de marketing con entrega en el año 206.
const ANIOS_ATRAS = 5
const ANIOS_ADELANTE = 5

export type RangoGantt = {
  fechaMin: Date
  totalDias: number
  /** Cuántas fechas se dejaron fuera del eje. La UI lo dice; si no, el usuario
   *  ve menos tareas de las que cargó y no hay forma de saber por qué. */
  descartadas: number
}

export function rangoGantt(fechas: (string | null | undefined)[], hoy: Date): RangoGantt {
  const minValido = hoy.getFullYear() - ANIOS_ATRAS
  const maxValido = hoy.getFullYear() + ANIOS_ADELANTE

  const validas: number[] = []
  let descartadas = 0
  for (const f of fechas) {
    const t = f ? new Date(f).getTime() : NaN
    if (Number.isNaN(t)) { descartadas++; continue }
    const anio = new Date(t).getFullYear()
    if (anio < minValido || anio > maxValido) { descartadas++; continue }
    validas.push(t)
  }

  if (validas.length === 0) {
    return { fechaMin: new Date(hoy.getTime()), totalDias: DIAS_POR_DEFECTO, descartadas }
  }

  const min = Math.min(...validas)
  const max = Math.max(...validas)
  const bruto = Math.ceil((max - min) / DIA_MS) + 1
  const totalDias = Math.min(Math.max(bruto, MIN_DIAS), MAX_DIAS)
  return { fechaMin: new Date(min), totalDias, descartadas }
}
