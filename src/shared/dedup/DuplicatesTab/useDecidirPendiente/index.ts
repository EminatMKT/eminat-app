'use client'
import { useState } from 'react'
import descartar from '@/shared/dedup/data/descartar'
import fusionar from '@/shared/dedup/data/fusionar'
import type { Pendiente } from '@/shared/dedup/types'

type EstadoDecidir = { ocupado: boolean; error: boolean }
const INICIAL: EstadoDecidir = { ocupado: false, error: false }

/** The two ways an open pair stops being pending: discarded with a motive, or merged. */
export default function useDecidirPendiente(
  entidad: string, abierto: Pendiente | null, elecciones: Record<string, string>, alDecidir: () => void,
) {
  const [estado, setEstado] = useState<EstadoDecidir>(INICIAL)
  const { ocupado, error } = estado
  const descartarPendiente = async (motivo: string, nota: string | null) => {
    if (!abierto) return
    setEstado(p => ({ ...p, ocupado: true, error: false }))
    const args = {
      entidad,
      itemIdA: abierto.item_id_a,
      itemIdB: abierto.item_id_b,
      motivo,
      nota,
    }
    const { error: fallo } = await descartar(args)
    if (fallo) return setEstado(p => ({ ...p, ocupado: false, error: true }))
    setEstado(INICIAL)
    alDecidir()
  }
  const fusionarPendiente = async () => {
    if (!abierto) return
    setEstado(p => ({ ...p, ocupado: true, error: false }))
    const args = {
      entidad,
      ganadorId: abierto.item_id_a,
      perdedorId: abierto.item_id_b,
      valoresFinales: elecciones,
    }
    const { error: fallo } = await fusionar(args)
    if (fallo) return setEstado(p => ({ ...p, ocupado: false, error: true }))
    setEstado(INICIAL)
    alDecidir()
  }
  const resultado = {
    ocupado,
    error,
    descartarPendiente,
    fusionarPendiente,
  }
  return resultado
}

// Owns the "resolve this pair" half of the tab: discard with a reviewer's motive, or merge the
// caller's chosen field values. `useAbrirPendiente` owns what is open; this only reads it.
