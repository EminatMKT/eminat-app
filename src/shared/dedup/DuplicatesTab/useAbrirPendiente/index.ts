'use client'
import { useRef, useState } from 'react'
import type { Pendiente } from '@/shared/dedup/types'
import type { EstadoAbierto } from './types'

function vacio<T>(): EstadoAbierto<T> {
  const estado: EstadoAbierto<T> = { parCargado: null, elecciones: {}, error: false }
  return estado
}

/** The open pair (if any), the two loaded items, and the merge choices made so far. A request
 *  counter drops a stale load that resolves after a newer `abrirPendiente` call started. */
export default function useAbrirPendiente<T>(cargarItem: (id: string) => Promise<T>) {
  const [estado, setEstado] = useState<EstadoAbierto<T>>(vacio())
  const { parCargado, elecciones, error } = estado
  const solicitud = useRef(0)

  const abrirPendiente = async (par: Pendiente) => {
    const mia = ++solicitud.current
    try {
      const [a, b] = await Promise.all([cargarItem(par.item_id_a), cargarItem(par.item_id_b)])
      if (solicitud.current !== mia) return
      const nuevo: EstadoAbierto<T> = { parCargado: { pendiente: par, a, b }, elecciones: {}, error: false }
      setEstado(nuevo)
    } catch {
      if (solicitud.current === mia) setEstado(p => ({ ...p, error: true }))
    }
  }

  const cerrarPendiente = () => { solicitud.current += 1; setEstado(vacio()) }
  const onElegir = (campo: string, valor: string) => {
    setEstado(p => ({ ...p, elecciones: { ...p.elecciones, [campo]: valor } }))
  }
  const resultado = {
    abierto: parCargado?.pendiente ?? null,
    itemA: parCargado?.a ?? null,
    itemB: parCargado?.b ?? null,
    elecciones,
    error,
    abrirPendiente,
    cerrarPendiente,
    onElegir,
  }
  return resultado
}

// Owns which pair is open and what has been loaded and chosen for it; `useDecidirPendiente`
// reads this state but never writes it directly — only `cerrarPendiente` resets it.
