import { NIVEL_EXACTA } from './types'
import type { Pendiente } from './types'

/** Exact level first, then oldest first within the same level: the pair waiting the longest. */
export default function ordenarPendientes<T extends Pendiente>(pares: readonly T[]): T[] {
  return [...pares].sort((a, b) => {
    if (a.nivel !== b.nivel) return a.nivel === NIVEL_EXACTA ? -1 : 1
    return a.detectado_at.localeCompare(b.detectado_at)
  })
}
