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

/** La ventana de años que el eje acepta. La UI la MUESTRA: "fuera de rango" a secas
 *  no le dice a nadie qué corregir. */
export function rangoAnios(hoy: Date): { min: number; max: number } {
  return { min: hoy.getFullYear() - ANIOS_ATRAS, max: hoy.getFullYear() + ANIOS_ADELANTE }
}

/** Los mismos años, en el formato que pide `<input type="date">`. Los formularios los usan
 *  como min/max para que no se pueda cargar una fecha que después el Gantt va a esconder:
 *  antes el input tenía '2020-01-01'/'2035-12-31' escritos a mano y la ventana del eje era
 *  otra, así que había fechas aceptadas al guardar e invisibles al mirar. */
export function limitesFecha(hoy: Date): { min: string; max: string } {
  const { min, max } = rangoAnios(hoy)
  return { min: `${min}-01-01`, max: `${max}-12-31` }
}

/** Predicado único de "esta fecha entra en el eje". Lo usan el cálculo del rango Y el
 *  componente para decidir qué filas dibujar, así que no pueden discrepar: si el aviso
 *  dice que seis tareas no se muestran, son exactamente esas seis las que se dejan fuera.
 *  Antes el componente mapeaba `actsGantt` entero, así que las descartadas seguían
 *  dibujando una fila vacía — el aviso decía una cosa y la pantalla otra. */
export function fechaEnRango(f: string | null | undefined, hoy: Date): boolean {
  const t = f ? new Date(f).getTime() : NaN
  if (Number.isNaN(t)) return false
  const { min, max } = rangoAnios(hoy)
  // getUTC*, no getFullYear: un `YYYY-MM-DD` de Postgres se parsea como medianoche UTC,
  // y leerlo en hora local lo corre al día anterior en cualquier huso al oeste de
  // Greenwich — el 1 de enero cae al año anterior y una fecha válida se descarta. Es la
  // misma trampa que codigo.md marca para toISOString(), en el sentido inverso.
  const anio = new Date(t).getUTCFullYear()
  return anio >= min && anio <= max
}

export function rangoGantt(fechas: (string | null | undefined)[], hoy: Date): RangoGantt {
  const validas: number[] = []
  let descartadas = 0
  for (const f of fechas) {
    if (!fechaEnRango(f, hoy)) { descartadas++; continue }
    validas.push(new Date(f as string).getTime())
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
