// Nombre de la persona cuyas tareas se muestran en el reporte impreso.
//
// Era `miembrosPorId[idRep] ?? usuario?.nombre ?? '—'`, y ese `??` del medio mentía. Tenía sentido
// cuando `idRep` era siempre quien miraba; desde que el reporte se puede pedir de cualquiera del
// equipo, caer al nombre de quien mira identifica las tareas de OTRO con tu nombre.
//
// Y no es hipotético: los dos catálogos salen de fuentes distintas. `miembrosPorId` deriva de
// `adminUsuarios` (`listAll()`, sujeto a RLS) y exige `nombre`; los asignables derivan de
// `usuarios` (`listActivos()`) y no lo exigen. Alguien activo, con el módulo y sin `nombre`
// cargado está en una y no en la otra — y para un no-admin `listAll()` puede traer menos filas.
//
// De ahí el orden: se pregunta PRIMERO a la lista que llena el desplegable, que es la que no
// puede faltar —si no estuviera, esa persona no sería elegible— y sólo después al catálogo, que
// es el único que conserva a los inactivos.
//
// Sin nombre se imprime el guion para evitar atribuir tareas a otra persona.
export function nombreDelReporte(
  idRep: string,
  asignables: { id: string; nombre: string }[],
  miembrosPorId: Record<string, string>,
  usuario: { id?: string | null; nombre?: string | null } | null | undefined,
): string {
  // Primero la MISMA lista que llena el desplegable: así la hoja dice exactamente lo que decía
  // la opción que se clickeó, en vez de ir a buscar el nombre a otro lado.
  const elegido = asignables.find(m => m.id === idRep)?.nombre
  // Después el catálogo, que es el único que tiene a la gente ya inactiva.
  const nombre = elegido || miembrosPorId[idRep]
  if (nombre) return nombre
  const esElPropio = Boolean(idRep) && idRep === usuario?.id
  return (esElPropio ? usuario?.nombre : '') || '—'
}
