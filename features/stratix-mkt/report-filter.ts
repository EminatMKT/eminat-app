// Decide si una actividad entra en el reporte de un miembro.
//
// La regla es "lo que ejecuto más lo que pedí". Antes había una excepción escrita
// con el ref literal de Freddy (`refRep === 'Coord_MFreddy'`), porque era el único
// que solicitaba: eso era un dato, no una regla. Con la FK deja de necesitar código.
export type ActividadRef = {
  responsable_id?: string | null
  solicitante_id?: string | null
  mes?: string | null
}

export function esActividadDeMiembro(act: ActividadRef, idMiembro: string, mes?: string): boolean {
  if (!idMiembro) return false
  const suya = act.responsable_id === idMiembro || act.solicitante_id === idMiembro
  if (!suya) return false
  return mes ? act.mes === mes : true
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
