import type { ReactNode } from 'react'
import type { Pendiente } from '../types'
import type { LoadSummaries } from './useListaDuplicados/loadNames/types'

/** What a caller plugs in: `DuplicatesTab` never reads the entity's own columns directly. */
export type Props<T> = {
  entidad: string
  cargarItem: (id: string) => Promise<T>
  renderResumen: (item: T) => string
  /** The caller's grid for the open pair; `controls` carries every pick and uncheck back. */
  renderComparacion: (a: T, b: T, controls: CompareControls) => ReactNode
  /** The full merge values for `a` (the winner) and `b`: every differing column resolved, the
   *  clicks in `elecciones` over the caller's default pick, and the unchecked loser rows, so a
   *  value the reviewer dropped is never written back through a scalar column. */
  construirValoresFinales: (
    a: T,
    b: T,
    elecciones: Record<string, string>,
    excludedIds: string[],
  ) => Record<string, unknown>
  /** Draws what the merge will save, from the very values `construirValoresFinales` hands the
   *  RPC, live as picks change. The pair and `controls` ride along for what never reaches those
   *  values: multivalued rows, kept or dropped via `excludedIds`. Optional: no preview without it. */
  renderPreview?: (a: T, b: T, valoresFinales: Record<string, unknown>, controls: CompareControls) => ReactNode
  /** One batched read of every pending id's display name, for the list rows. */
  loadSummaries: LoadSummaries
}

/** What a caller's comparison grid reads and changes: the reviewer's left/right picks, and the
 *  multivalued values unchecked so far. Built by `useAbrirPendiente`. */
export type CompareControls = {
  choices: Record<string, string>
  onChoose: (field: string, value: string) => void
  excludedIds: string[]
  onToggleExcluded: (ids: string[]) => void
}

/** The whole screen in one value: the list, the open pair's two loaded items, and the in-flight
 *  merge choices — grouped so a reset or a preload is one assignment, not nine setters. */
export type Estado<T> = {
  pendientes: Pendiente[]
  abierto: Pendiente | null
  itemA: T | null
  itemB: T | null
  elecciones: Record<string, string>
  notaAbierta: boolean
  ocupado: boolean
  error: boolean
}
