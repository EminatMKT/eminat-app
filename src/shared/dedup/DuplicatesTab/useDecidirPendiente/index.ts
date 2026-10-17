'use client'
import { useRef, useState } from 'react'
import type { Pendiente } from '@/shared/dedup/types'
import descartar from '@/shared/dedup/data/descartar'
import fusionar from '@/shared/dedup/data/fusionar'
import buildDiscardArgs from './buildDiscardArgs'
import buildMergeArgs from './buildMergeArgs'
import { FAILED_DISCARD, FAILED_MERGE, IDLE } from './constants'
import flagsForPair from './flagsForPair'
import isSameMoment from './isSameMoment'
import nextGeneration from './nextGeneration'
import pairKey from './pairKey'
import type { Args, EstadoDecidir, PairMoment } from './types'

/** The two ways an open pair stops being pending: discarded with a motive, or merged. */
export default function useDecidirPendiente<T>(args: Args<T>) {
  const { entidad, abierto } = args
  const { itemA, itemB, elecciones, excludedIds } = args
  const { construirValoresFinales, alDecidir } = args
  const initialTracked: { abierto: Pendiente | null; generation: number } = { abierto: null, generation: 0 }
  const trackedRef = useRef(initialTracked)
  const generation = nextGeneration(trackedRef.current.abierto, abierto, trackedRef.current.generation)
  trackedRef.current = { abierto, generation }
  const pair = pairKey(abierto)
  const moment: PairMoment = { pair, generation }
  const initial: EstadoDecidir = { ...IDLE, pair }
  const [estado, setEstado] = useState<EstadoDecidir>(initial)
  const busy = (): EstadoDecidir => ({ ...IDLE, ocupado: true, pair })

  // A result that lands after its pair closed — or closed and reopened — belongs to nobody.
  const settle = (mine: PairMoment, failure: Partial<EstadoDecidir> | null) => {
    const live: PairMoment = { pair: pairKey(trackedRef.current.abierto), generation: trackedRef.current.generation }
    if (!isSameMoment(mine, live)) return
    const settled: EstadoDecidir = { ...IDLE, ...failure, pair: mine.pair }
    setEstado(settled)
    if (!failure) alDecidir()
  }
  const descartarPendiente = async (motivo: string, nota: string | null) => {
    if (!abierto) return
    setEstado(busy())
    const { error: fallo } = await descartar(buildDiscardArgs(entidad, abierto, motivo, nota))
    settle(moment, fallo ? FAILED_DISCARD : null)
  }
  const fusionarPendiente = async () => {
    // Nothing to merge until both sides are loaded: the values are built from the two rows.
    if (!abierto || itemA === null || itemB === null) return
    setEstado(busy())
    const valoresFinales = construirValoresFinales(itemA, itemB, elecciones, excludedIds)
    const { error: fallo } = await fusionar(buildMergeArgs(entidad, abierto, valoresFinales, excludedIds))
    settle(moment, fallo ? FAILED_MERGE : null)
  }
  const resultado = { ...flagsForPair(estado, pair), descartarPendiente, fusionarPendiente }
  return resultado
}

// Owns the "resolve this pair" half of the tab. Its flags are filed under the pair they belong
// to, and a "moment" (pair + generation) guards against a result from a closed-and-reopened
// pair being mistaken for the one that's open now.
