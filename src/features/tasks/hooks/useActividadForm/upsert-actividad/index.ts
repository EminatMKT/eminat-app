// `Actividad.id` is optional in its type even though every saved row has one.
type ConId = Partial<Record<'id', string>>

/** Replaces the task in place when it is already listed; otherwise adds it first (newest-first). */
export default function upsertActividad<T extends ConId>(lista: T[], actividad: T): T[] {
  const yaEsta = lista.some(x => x.id === actividad.id)
  if (!yaEsta) return [actividad, ...lista]
  return lista.map(x => (x.id === actividad.id ? actividad : x))
}

// upsertActividad lets one save path serve both create and edit: the form does not need to know
// which one it was to put the saved task back on the board.
