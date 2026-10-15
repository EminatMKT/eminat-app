import type { Pendiente } from '@/shared/dedup/types'

/** One pending pair with both sides already loaded. */
export type ParCargado<T> = { pendiente: Pendiente; a: T; b: T }

/** The open pair, when one exists; the merge choices made on it; and whether the last load failed. */
export type EstadoAbierto<T> = {
  parCargado: ParCargado<T> | null
  elecciones: Record<string, string>
  error: boolean
}
