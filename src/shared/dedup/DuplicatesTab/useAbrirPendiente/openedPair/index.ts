import type { Pendiente } from '@/shared/dedup/types'
import type { EstadoAbierto } from '../types'

/** A freshly loaded pair: nothing chosen and nothing excluded yet, whatever the last pair had. */
export default function openedPair<T>(pendiente: Pendiente, a: T, b: T): EstadoAbierto<T> {
  const state: EstadoAbierto<T> = {
    parCargado: { pendiente, a, b },
    elecciones: {},
    excludedIds: [],
    error: false,
  }
  return state
}

// Builds the state `useAbrirPendiente` sets on a successful load, so a pair never starts with
// the previous pair's choices or exclusions.
