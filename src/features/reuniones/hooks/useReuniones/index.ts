'use client'
import { useCallback, useEffect, useState } from 'react'
import { reunionesRepo } from '@/shared/data'
import type { Reunion } from '@/features/reuniones/types'

// Un solo objeto de estado: la lista, el cargando y el error se llenan juntos y en la misma
// respuesta, así que no hay forma de que queden desincronizados.
type Estado = { reuniones: Reunion[]; cargando: boolean; error: string | null }
const VACIO: Estado = { reuniones: [], cargando: true, error: null }

export function useReuniones() {
  const [estado, setEstado] = useState<Estado>(VACIO)
  const { reuniones, cargando, error } = estado

  const recargar = useCallback(async () => {
    setEstado(p => ({ ...p, cargando: true }))
    const { data, error: err } = await reunionesRepo.list()
    setEstado({ reuniones: data ?? [], cargando: false, error: err?.message ?? null })
  }, [])

  useEffect(() => { void recargar() }, [recargar])

  // El contrato del hook va en una variable con nombre: son cuatro campos (rules/codigo.md).
  const resultado = { reuniones, cargando, error, recargar }
  return resultado
}
