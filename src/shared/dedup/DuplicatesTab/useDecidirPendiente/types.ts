import type { Pendiente } from '@/shared/dedup/types'
import type { Props } from '../types'

/** What deciding the open pair needs: the pair, both loaded sides, the reviewer's clicks, and
 *  the caller's own rule for turning them into the full merge values. */
export type Args<T> = Pick<Props<T>, 'entidad' | 'construirValoresFinales'> & {
  abierto: Pendiente | null
  itemA: T | null
  itemB: T | null
  elecciones: Record<string, string>
  alDecidir: () => void
}

/** Discard and merge fail for different reasons, so each keeps its own flag and its own copy. */
export type EstadoDecidir = {
  ocupado: boolean
  errorDescarte: boolean
  errorFusion: boolean
}
