import type { ReactNode } from 'react'
import type { Pendiente } from '../types'

/** What a caller plugs in: `DuplicatesTab` never reads the entity's own columns directly. */
export type Props<T> = {
  entidad: string
  cargarItem: (id: string) => Promise<T>
  renderResumen: (item: T) => string
  renderComparacion: (a: T, b: T, onElegir: (campo: string, valor: string) => void) => ReactNode
  /** The full merge values for `a` (the winner) and `b`: every column that differs resolved,
   *  with the reviewer's clicks in `elecciones` overriding the caller's default pick, and the
   *  loser child rows the reviewer unchecked, so a value they dropped is never written back
   *  through a scalar column. */
  construirValoresFinales: (
    a: T,
    b: T,
    elecciones: Record<string, string>,
    excludedIds: string[],
  ) => Record<string, unknown>
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
