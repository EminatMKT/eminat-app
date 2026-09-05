'use client'
import { useCallback, useEffect, useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { vistasFiltroRepo, type VistaFiltro } from '@/shared/data'
import type { FilterValues } from '@/shared/utils'

// Las vistas guardadas de UN ámbito. Se leen una vez al montar y se releen tras cada escritura:
// son pocas por persona (unidades, no cientos) y el costo de un refetch es menor que el de
// mantener una copia local sincronizada a mano y verla derivar.
export function useVistas(ambito: string) {
  const { usuario } = useApp()
  const [vistas, setVistas] = useState<VistaFiltro[]>([])

  const recargar = useCallback(async () => {
    const { data } = await vistasFiltroRepo.list(ambito)
    setVistas(data ?? [])
  }, [ambito])

  useEffect(() => { void recargar() }, [recargar])

  // Devuelve la vista creada: quien guarda queda PARADO en ella. Sin esto, «guardar como nueva»
  // dejaba el desplegable apuntando a la vista vieja y marcada como modificada — o sea, decía que
  // los cambios seguían sin guardar justo después de guardarlos.
  const guardar = async (nombre: string, valores: FilterValues, ocultos: string[]) => {
    if (!usuario?.id) return undefined
    const { data } = await vistasFiltroRepo.create({
      usuario_id: usuario.id, ambito, nombre, valores, ocultos, abre_por_defecto: false })
    await recargar()
    return data ?? undefined
  }
  const actualizar = async (id: string, valores: FilterValues, ocultos: string[]) => {
    await vistasFiltroRepo.update(id, { valores, ocultos })
    await recargar()
  }
  const renombrar = async (id: string, nombre: string) => {
    await vistasFiltroRepo.rename(id, nombre)
    await recargar()
  }
  const borrar = async (id: string) => { await vistasFiltroRepo.remove(id); await recargar() }
  const marcarPorDefecto = async (id: string) => {
    if (!usuario?.id) return
    await vistasFiltroRepo.marcarPorDefecto(usuario.id, ambito, id)
    await recargar()
  }

  const api = { vistas, guardar, actualizar, renombrar, borrar, marcarPorDefecto }
  return api
}
