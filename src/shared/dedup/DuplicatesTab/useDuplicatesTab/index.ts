'use client'
import useListaDuplicados from '../useListaDuplicados'
import useAbrirPendiente from '../useAbrirPendiente'
import useDecidirPendiente from '../useDecidirPendiente'
import type { Props } from '../types'

/** The tab's three hooks wired together: the queue, the open pair, and resolving it — which
 *  closes the pair and reloads the queue once the decision lands. */
export default function useDuplicatesTab<T>(props: Props<T>) {
  const { entidad, cargarItem, loadSummaries } = props
  const list = useListaDuplicados(entidad, loadSummaries)
  const pair = useAbrirPendiente(cargarItem)
  const onResolved = () => { pair.cerrarPendiente(); void list.recargar() }
  const resolveArgs = { ...props, ...pair, alDecidir: onResolved }
  const resolve = useDecidirPendiente(resolveArgs)
  const tab = { list, pair, resolve }
  return tab
}

// Keeps `DuplicatesTab` a render-only file: the wiring between its three hooks lives here.
