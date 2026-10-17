import type { Pendiente } from '@/shared/dedup/types'
import type { CompareControls } from '@/shared/dedup/DuplicatesTab/types'
import type { EstadoAbierto } from '../types'

type Callbacks = {
  abrirPendiente: (par: Pendiente) => Promise<void>
  cerrarPendiente: () => void
  onElegir: (campo: string, valor: string) => void
  onToggleExcluded: (ids: string[]) => void
}

/** The hook's public contract: the open pair's loaded state, plus every setter a caller uses. */
export default function buildResultado<T>(estado: EstadoAbierto<T>, callbacks: Callbacks, controls: CompareControls) {
  const { parCargado, elecciones, excludedIds, error } = estado
  const { abrirPendiente, cerrarPendiente, onElegir, onToggleExcluded } = callbacks
  const resultado = {
    abierto: parCargado?.pendiente ?? null,
    itemA: parCargado?.a ?? null,
    itemB: parCargado?.b ?? null,
    elecciones,
    excludedIds,
    error,
    abrirPendiente,
    cerrarPendiente,
    onElegir,
    onToggleExcluded,
    controls,
  }
  return resultado
}

// Builds the hook's return value, pulled out of `useAbrirPendiente` so this 11-field literal
// doesn't push the hook over this repo's file-length cap.
