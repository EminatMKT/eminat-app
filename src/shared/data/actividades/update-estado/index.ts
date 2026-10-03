import optimisticUpdate from '../optimistic-update'

/** Moves a task to another Kanban column, if nobody changed it since the screen read it. */
export default function updateEstado(id: string, estado: string, expectedUpdatedAt?: string) {
  const change = { estado }
  return optimisticUpdate(id, change, expectedUpdatedAt)
}

// The Kanban drag sends only the column: the rest of the row stays as the database has it, and a
// stale card is answered as a conflict with the row in force.
