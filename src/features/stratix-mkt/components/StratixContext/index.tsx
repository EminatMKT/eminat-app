'use client'
import { createContext, useContext } from 'react'
import { useUserPreference, oneOf } from '@/shared/hooks'
import { STRATIX_TAB, STRATIX_TABS, STRATIX_TAB_PREF } from '@/features/stratix-mkt/constants/tabs'
import {
  useTablero, useKanban, useSolicitudes, useActividadForm, useReporte,
} from '@/features/stratix-mkt/hooks'
import type { StratixData, StratixProviderProps } from './tipos'

const Ctx = createContext<StratixData | null>(null)

// El provider compone los cinco hooks de datos; QUÉ pestaña está abierta depende de por qué
// ruta se entró. `/tasks` monta los mismos hooks con su propio catálogo y su propia clave: si
// la compartieran, abrir un módulo cambiaría la sección del otro.
export function StratixProvider({ children, prefKey = STRATIX_TAB_PREF, tabs = STRATIX_TABS, tabInicial = STRATIX_TAB.SOCIAL }: StratixProviderProps) {
  const [mktTab, setMktTab] = useUserPreference<string>(prefKey, tabInicial, oneOf(...tabs))

  // Acá se componen los cinco hooks porque este es el componente que los necesita juntos: el
  // provider es lo único que ve el módulo entero. Lo único que se decide es qué depende de qué
  // — `useReporte` recibe `idsTeam` del tablero porque quién entra en el reporte es la misma
  // decisión de permisos que la de las gráficas, y calcularla dos veces era la forma de que
  // las dos se desincronizaran.
  const tablero = useTablero()
  const kanban = useKanban()
  const solicitudes = useSolicitudes()
  const formulario = useActividadForm()
  const reporte = useReporte(tablero.idsTeam)

  const data: StratixData = {
    mktTab, setMktTab, ...tablero, ...kanban, ...solicitudes, ...formulario, ...reporte,
  }

  return <Ctx.Provider value={data}>{children}</Ctx.Provider>
}

export function useStratix(): StratixData {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStratix debe usarse dentro de <StratixProvider>')
  return v
}
