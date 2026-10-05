/** The two columns every activity read carries for optimistic edits. */
export type ActivityKeys = {
  id: string
  updated_at?: string
}

/** One `actividades` row as the screens read it, responsables already flattened in. */
export type ActivityRow = Record<string, unknown> & ActivityKeys

/** One row of `actividad_responsables`: who executes the task, and whether they lead it. */
export type ActivityResponsableRow = {
  usuario_id: string
  es_lider: boolean
}

/** The join table as PostgREST embeds it; absent or null when the task has nobody. */
export type ActivityEmbed = {
  actividad_responsables?: ActivityResponsableRow[] | null
}

/** A row exactly as the select returns it, before the embed is flattened. */
export type ActivityRowWithEmbed = ActivityRow & ActivityEmbed

/** The part of a Supabase error this layer hands back. */
export type RepoError = {
  message: string
}

/** An edit checked against the `updated_at` the screen read; `current` is set on a conflict. */
export type OptimisticUpdateResult = {
  data: ActivityRow | null
  error: RepoError | null
  conflict: boolean
  current?: ActivityRow | null
}

// The row shapes of the activities repository. Rows stay open (`Record<string, unknown>`) because
// the screens type them with their own `Actividad`; only the keys the repository itself reads, and
// the embed it flattens, are spelled out here.
