import type { ActivityRow, ActivityRowWithEmbed } from '../types'

/** Moves the embedded join rows to `responsables`, the shape the screens read. */
export default function flattenEmbed(row: ActivityRowWithEmbed): ActivityRow {
  const { actividad_responsables, ...activity } = row
  const flattened = { ...activity, responsables: actividad_responsables ?? [] }
  return flattened
}

// PostgREST embeds `actividad_responsables` under the table's name and omits it, or sends null,
// when the task has nobody. Every read of the repository goes through here, so the screens always
// get `responsables` as a list and never learn the name of the join table.
