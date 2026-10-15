import type { ReactNode } from 'react'
import type { Pendiente } from '../types'

/** What a caller plugs in: `DuplicatesTab` never reads the entity's own columns directly. */
export type Props<T> = {
  entidad: string
  cargarItem: (id: string) => Promise<T>
  renderResumen: (item: T) => string
  renderComparacion: (a: T, b: T, onElegir: (campo: string, valor: string) => void) => ReactNode
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
