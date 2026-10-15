'use client'
import { useState } from 'react'
import type { Pendiente } from '@/shared/dedup/types'

type EstadoAbierto<T> = {
  abierto: Pendiente | null
  itemA: T | null
  itemB: T | null
  elecciones: Record<string, string>
}

function vacio<T>(): EstadoAbierto<T> {
  const estado: EstadoAbierto<T> = {
    abierto: null,
    itemA: null,
    itemB: null,
    elecciones: {},
  }
  return estado
}

/** The open pair (if any), the two loaded items, and the merge choices made so far. */
export default function useAbrirPendiente<T>(cargarItem: (id: string) => Promise<T>) {
  const [estado, setEstado] = useState<EstadoAbierto<T>>(vacio())
  const { abierto, itemA, itemB, elecciones } = estado
  const abrirPendiente = async (par: Pendiente) => {
    const [a, b] = await Promise.all([cargarItem(par.item_id_a), cargarItem(par.item_id_b)])
    setEstado(p => ({
      ...p,
      abierto: par,
      itemA: a,
      itemB: b,
      elecciones: {},
    }))
  }
  const cerrarPendiente = () => setEstado(vacio())
  const onElegir = (campo: string, valor: string) => {
    setEstado(p => ({ ...p, elecciones: { ...p.elecciones, [campo]: valor } }))
  }
  const resultado = {
    abierto,
    itemA,
    itemB,
    elecciones,
    abrirPendiente,
    cerrarPendiente,
    onElegir,
  }
  return resultado
}

// Owns which pair is open and what has been loaded and chosen for it; `useDecidirPendiente`
// reads this state but never writes it directly — only `cerrarPendiente` resets it.
