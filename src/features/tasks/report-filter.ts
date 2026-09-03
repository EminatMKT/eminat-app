// Decide si una actividad entra en el reporte de un miembro.
//
// La regla es "lo que ejecuto más lo que pedí". Antes había una excepción escrita
// con el ref literal de Freddy (`refRep === 'Coord_MFreddy'`), porque era el único
// que solicitaba: eso era un dato, no una regla. Con la FK deja de necesitar código.
import { claveMes } from '@/features/tasks/utils/periodo'

export type ActividadRef = {
  responsable_id?: string | null
  solicitante_id?: string | null
  fecha_inicio?: string | null
}

// `mes` es la clave 'YYYY-MM', no la etiqueta. Antes era `act.mes === 'Agosto'` sobre una columna
// de texto sin año, así que el reporte de un mes sumaba ese mes de TODOS los años: en enero de
// 2027 el reporte de Enero habría incluido enero de 2026. El año va en la clave.
export function esActividadDeMiembro(act: ActividadRef, idMiembro: string, mes?: string): boolean {
  if (!idMiembro) return false
  const suya = act.responsable_id === idMiembro || act.solicitante_id === idMiembro
  if (!suya) return false
  return mes ? claveMes(act.fecha_inicio) === mes : true
}

export type ActividadProduccion = ActividadRef & {
  horas?: number | string | null
  dias_produccion?: number | string | null
}

// Cifras remuneradas del reporte: horas y días de producción.
//
// LISTAR SÍ, SUMAR NO. El listado (`esActividadDeMiembro`) incluye lo que el
// miembro solicitó — así ve lo que delegó—, pero las cifras cuentan SOLO lo que
// ejecuta. La pestaña es un *Production Payment Report* y las horas se pagan una
// vez, a quien las produjo. Como el form de nueva tarea autocompleta el
// solicitante con el usuario logueado, si acá se sumara lo solicitado, cada tarea
// que alguien crea para un compañero sumaría las horas de ese compañero también a
// su propio pago: las mismas horas, cobradas dos veces.
//
// Por eso el total de tareas del reporte y estas dos cifras divergen a propósito.
// No "arreglar" pasándole `acts` sin filtrar.
export function totalesProduccion(acts: ActividadProduccion[], idMiembro: string): { horas: number; dias: number } {
  const ejecutadas = idMiembro ? acts.filter(a => a.responsable_id === idMiembro) : []
  return {
    horas: Math.round(ejecutadas.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10,
    dias: ejecutadas.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0),
  }
}
