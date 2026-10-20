'use client'
import { useEffect, useRef, useState } from 'react'
import listPendientes from '@/shared/dedup/data/listPendientes'
import escanear from '@/shared/dedup/data/escanear'
import ordenarPendientes from '@/shared/dedup/ordenarPendientes'
import loadNames from './loadNames'
import type { LoadSummaries } from './loadNames/types'
import { INICIAL, NO_REQUEST_YET } from './constants'
import type { EstadoLista } from './types'

/** The pending-pair queue for one entity, its display names, and the scan that refills it. */
export default function useListaDuplicados(entidad: string, loadSummaries: LoadSummaries) {
  const [estado, setEstado] = useState<EstadoLista>(INICIAL)
  const request = useRef<number>(NO_REQUEST_YET)

  // Only the newest reload writes: an older one answering late would put back a stale queue.
  const recargar = async () => {
    const mine = ++request.current
    const { data, error: fallo } = await listPendientes(entidad)
    if (request.current !== mine) return
    if (fallo) return setEstado(p => ({ ...p, error: true }))
    const queue = ordenarPendientes(data ?? [])
    const listed = { pendientes: queue, namesLoading: true, error: false }
    setEstado(p => ({ ...p, ...listed }))
    const showNames = (names: Record<string, string>) => {
      if (request.current !== mine) return
      setEstado(p => ({ ...p, summaries: names, namesLoading: false }))
    }
    void loadNames(queue, loadSummaries).then(showNames)
  }

  useEffect(() => { void recargar() }, [entidad])

  const escanearPendientes = async () => {
    setEstado(p => ({ ...p, ocupado: true, error: false }))
    const { error: fallo } = await escanear(entidad)
    if (fallo) return setEstado(p => ({ ...p, ocupado: false, error: true }))
    await recargar()
    setEstado(p => ({ ...p, ocupado: false }))
  }

  const resultado = { ...estado, escanearPendientes, recargar }
  return resultado
}

// Owns the pending-pair queue for `DuplicatesTab`. Pairs show as soon as they load; their names
// follow from `loadNames` without ever holding the list or the scan back.
