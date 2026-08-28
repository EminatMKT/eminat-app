import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { SIN_FILTRO } from '@/shared/constants/domain'
import type { SolicitudesCriterios } from '@/features/stratix-mkt/types'

const SIN_CRITERIOS: SolicitudesCriterios = { busqueda: '', estado: SIN_FILTRO }

// La vista de solicitudes: búsqueda y filtro por estado. Los dos criterios van en un objeto
// porque se aplican juntos sobre la misma lista; `tab` es independiente (elige la vista, no
// filtra) y por eso queda suelto.
export function useSolicitudes() {
  const { actividades } = useApp()

  // centinela-exime: useState@1 — `solTab` elige QUÉ vista se muestra; los criterios filtran lo
  // que hay dentro de ella. Cambiar de pestaña no debe tocar el filtro ni al revés.
  const [criterios, setCriterios] = useState<SolicitudesCriterios>(SIN_CRITERIOS)
  const [solTab, setSolTab] = useState('lista')
  const { busqueda, estado } = criterios

  const setBusquedaSol = (valor: string) => setCriterios(p => ({ ...p, busqueda: valor }))
  const setFiltroEstadoSol = (valor: string) => setCriterios(p => ({ ...p, estado: valor }))

  const coincideTexto = (valor: string | undefined) => valor?.toLowerCase().includes(busqueda.toLowerCase()) ?? false
  const actsFiltradasSol = actividades
    .filter(a => estado === SIN_FILTRO || a.estado === estado)
    .filter(a => busqueda === '' || coincideTexto(a.titulo) || coincideTexto(a.empresa))

  const solicitudes = {
    busquedaSol: busqueda,
    filtroEstadoSol: estado,
    setBusquedaSol,
    setFiltroEstadoSol,
    actsFiltradasSol,
    solTab,
    setSolTab,
  }

  return solicitudes
}
