'use client'
import { createContext, useContext } from 'react'
import { useUserPreference, oneOf } from '@/shared/hooks'
import { TASKS_TAB, TASKS_TABS, TASKS_TAB_PREF } from '@/features/tasks/constants/tabs'
import {
  useTablero, useKanban, useSolicitudes, useActividadForm, useReporte,
} from '@/features/tasks/hooks'
import type { TasksData, TasksProviderProps } from './tipos'

const Ctx = createContext<TasksData | null>(null)

// El provider compone los cinco hooks de datos; QUÉ pestaña está abierta depende de por qué
// ruta se entró. Los defaults son los de `/tasks`, que es su módulo; Stratix lo monta con los
// suyos porque su sección Team cuenta tareas. Si compartieran la clave de preferencia, abrir
// un módulo cambiaría la sección con la que abre el otro.
export function TasksProvider({ children, prefKey = TASKS_TAB_PREF, tabs = TASKS_TABS, tabInicial = TASKS_TAB.KANBAN }: TasksProviderProps) {
  const [tabActiva, setTabActiva] = useUserPreference<string>(prefKey, tabInicial, oneOf(...tabs))

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

  const data: TasksData = {
    tabActiva, setTabActiva, ...tablero, ...kanban, ...solicitudes, ...formulario, ...reporte,
  }

  return <Ctx.Provider value={data}>{children}</Ctx.Provider>
}

export function useTasks(): TasksData {
  const v = useContext(Ctx)
  if (!v) throw new Error('useTasks debe usarse dentro de <TasksProvider>')
  return v
}
