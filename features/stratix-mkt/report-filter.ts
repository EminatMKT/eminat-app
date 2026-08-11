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
