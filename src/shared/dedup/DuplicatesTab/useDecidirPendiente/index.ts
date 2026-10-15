'use client'
import { useState } from 'react'
import descartar from '@/shared/dedup/data/descartar'
import fusionar from '@/shared/dedup/data/fusionar'
import type { Args, EstadoDecidir } from './types'

const INICIAL: EstadoDecidir = { ocupado: false, errorDescarte: false, errorFusion: false }

/** The two ways an open pair stops being pending: discarded with a motive, or merged. */
export default function useDecidirPendiente<T>(args: Args<T>) {
  const { entidad, abierto } = args
  const { itemA, itemB, elecciones } = args
  const { construirValoresFinales, alDecidir } = args
  const [estado, setEstado] = useState<EstadoDecidir>(INICIAL)
  const descartarPendiente = async (motivo: string, nota: string | null) => {
    if (!abierto) return
    setEstado(() => ({ ...INICIAL, ocupado: true }))
    const args = {
      entidad,
      itemIdA: abierto.item_id_a,
      itemIdB: abierto.item_id_b,
      motivo,
      nota,
    }
    const { error: fallo } = await descartar(args)
    if (fallo) return setEstado(() => ({ ...INICIAL, errorDescarte: true }))
    setEstado(INICIAL)
    alDecidir()
  }
  const fusionarPendiente = async () => {
    // Nothing to merge until both sides are loaded: the values are built from the two rows.
    if (!abierto || itemA === null || itemB === null) return
    setEstado(() => ({ ...INICIAL, ocupado: true }))
    const args = {
      entidad,
      ganadorId: abierto.item_id_a,
      perdedorId: abierto.item_id_b,
      valoresFinales: construirValoresFinales(itemA, itemB, elecciones),
    }
    const { error: fallo } = await fusionar(args)
    if (fallo) return setEstado(() => ({ ...INICIAL, errorFusion: true }))
    setEstado(INICIAL)
    alDecidir()
  }
  const resultado = { ...estado, descartarPendiente, fusionarPendiente }
  return resultado
}

// Owns the "resolve this pair" half of the tab: discard with a reviewer's motive, or merge with
// the full values the caller builds. `useAbrirPendiente` owns what is open; this only reads it.
