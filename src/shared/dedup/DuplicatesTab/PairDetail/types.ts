import type { ReactNode } from 'react'

/** The open pair: a side-by-side summary, the caller's own comparison grid, and the four
 *  decisions available once two candidates are loaded. */
export type Props<T> = {
  itemA: T
  itemB: T
  ocupado: boolean
  error: boolean
  renderResumen: (item: T) => string
  renderComparacion: (a: T, b: T, onElegir: (campo: string, valor: string) => void) => ReactNode
  onElegir: (campo: string, valor: string) => void
  onCancelar: () => void
  onNotSame: () => void
  onKeepSeparate: (nota: string) => void
  onFusionar: () => void
}
