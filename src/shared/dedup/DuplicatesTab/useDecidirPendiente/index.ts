'use client'
import { useRef, useState } from 'react'
import descartar from '@/shared/dedup/data/descartar'
import fusionar from '@/shared/dedup/data/fusionar'
import buildDiscardArgs from './buildDiscardArgs'
import buildMergeArgs from './buildMergeArgs'
import { FAILED_DISCARD, FAILED_MERGE, IDLE } from './constants'
import flagsForPair from './flagsForPair'
import pairKey from './pairKey'
import type { Args, EstadoDecidir } from './types'

/** The two ways an open pair stops being pending: discarded with a motive, or merged. */
export default function useDecidirPendiente<T>(args: Args<T>) {
  const { entidad, abierto } = args
  const { itemA, itemB, elecciones, excludedIds } = args
  const { construirValoresFinales, alDecidir } = args
  const pair = pairKey(abierto)
  const initial: EstadoDecidir = { ...IDLE, pair }
  const [estado, setEstado] = useState<EstadoDecidir>(initial)
  const openPair = useRef(pair)
  openPair.current = pair

  // A result that lands after its pair closed belongs to nobody: it neither shows nor closes.
  const settle = (mine: string | null, failure: Partial<EstadoDecidir> | null) => {
    if (openPair.current !== mine) return
    const settled: EstadoDecidir = { ...IDLE, ...failure, pair: mine }
    setEstado(settled)
    if (!failure) alDecidir()
  }
  const descartarPendiente = async (motivo: string, nota: string | null) => {
    if (!abierto) return
    const working: EstadoDecidir = { ...IDLE, ocupado: true, pair }
    setEstado(working)
    const { error: fallo } = await descartar(buildDiscardArgs(entidad, abierto, motivo, nota))
    settle(pair, fallo ? FAILED_DISCARD : null)
  }
  const fusionarPendiente = async () => {
    // Nothing to merge until both sides are loaded: the values are built from the two rows.
    if (!abierto || itemA === null || itemB === null) return
    const working: EstadoDecidir = { ...IDLE, ocupado: true, pair }
    setEstado(working)
    const valoresFinales = construirValoresFinales(itemA, itemB, elecciones, excludedIds)
    const { error: fallo } = await fusionar(buildMergeArgs(entidad, abierto, valoresFinales, excludedIds))
    settle(pair, fallo ? FAILED_MERGE : null)
  }
  const resultado = { ...flagsForPair(estado, pair), descartarPendiente, fusionarPendiente }
  return resultado
}

// Owns the "resolve this pair" half of the tab. Its flags are filed under the pair they belong
// to, so opening another pair always starts idle; `useAbrirPendiente` owns what is open.
