'use client'
import { useEffect, useState } from 'react'
import listPendientes from '@/shared/dedup/data/listPendientes'
import escanear from '@/shared/dedup/data/escanear'
import ordenarPendientes from '@/shared/dedup/ordenarPendientes'
import type { Pendiente } from '@/shared/dedup/types'

type EstadoLista = {
  pendientes: Pendiente[]
  ocupado: boolean
  error: boolean
}

const INICIAL: EstadoLista = { pendientes: [], ocupado: false, error: false }

/** The pending-pair queue for one entity, and the scan that refills it. */
export default function useListaDuplicados(entidad: string) {
  const [estado, setEstado] = useState<EstadoLista>(INICIAL)
  const { pendientes, ocupado, error } = estado

  const recargar = async () => {
    const { data, error: fallo } = await listPendientes(entidad)
    if (fallo) return setEstado(p => ({ ...p, error: true }))
    setEstado(p => ({ ...p, pendientes: ordenarPendientes(data ?? []), error: false }))
  }

  useEffect(() => { void recargar() }, [entidad])

  const escanearPendientes = async () => {
    setEstado(p => ({ ...p, ocupado: true, error: false }))
    const { error: fallo } = await escanear(entidad)
    if (fallo) return setEstado(p => ({ ...p, ocupado: false, error: true }))
    await recargar()
    setEstado(p => ({ ...p, ocupado: false }))
  }

  const resultado = {
    pendientes,
    ocupado,
    error,
    escanearPendientes,
    recargar,
  }
  return resultado
}

// Owns the pending-pair queue for `DuplicatesTab`: what is waiting, and the scan that looks for
// more. Separated from the open-pair state so each stays small enough to read in one sitting.
