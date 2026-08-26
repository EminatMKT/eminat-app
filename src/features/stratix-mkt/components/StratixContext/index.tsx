'use client'
import { createContext, useContext } from 'react'
import { useUserPreference, oneOf } from '@/shared/hooks'
import { STRATIX_TAB, STRATIX_TABS, STRATIX_TAB_PREF, type StratixTab } from '@/features/stratix-mkt/constants/tabs'
import {
  useTablero, useKanban, useSolicitudes, useActividadForm, useReporte,
} from '@/features/stratix-mkt/hooks'

type StratixData =
  & ReturnType<typeof useTablero>
  & ReturnType<typeof useKanban>
  & ReturnType<typeof useSolicitudes>
  & ReturnType<typeof useActividadForm>
  & ReturnType<typeof useReporte>
  // La firma del setter es la de useUserPreference: acepta el valor o un actualizador.
  & { mktTab: StratixTab; setMktTab: (v: StratixTab | ((p: StratixTab) => StratixTab)) => void }

const Ctx = createContext<StratixData | null>(null)

export function StratixProvider({ children }: { children: React.ReactNode }) {
  const [mktTab, setMktTab] = useUserPreference<StratixTab>(STRATIX_TAB_PREF, STRATIX_TAB.KANBAN, oneOf(...STRATIX_TABS))

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
