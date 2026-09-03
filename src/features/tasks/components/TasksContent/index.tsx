'use client'
import dynamic from 'next/dynamic'
import { ModuloTabs } from '@/shared/components/shell'
import { LoadingView } from '@/shared/components/ui'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import KanbanTab from '@/features/stratix-mkt/components/kanban/KanbanTab'
import SolicitudesTab from '@/features/stratix-mkt/components/solicitudes/SolicitudesTab'
import ReporteTab from '@/features/stratix-mkt/components/reporte/ReporteTab'
import ActivityDetailModal from '@/features/stratix-mkt/components/modals/ActivityDetailModal'
import NewActivityModal from '@/features/stratix-mkt/components/modals/NewActivityModal'
import { TASKS_TABS, type TasksTab } from '@/features/tasks/constants/tabs'

// La única que arrastra recharts —por los cards del tablero— y además monta el Gantt. Las otras
// tres son tablas y tarjetas: envolverlas agregaría un chunk y un viaje de red a cambio de nada.
// Es la misma decisión que en Stratix, tomada con el mismo criterio y no por simetría.
const OverviewTab = dynamic(() => import('@/features/stratix-mkt/components/overview/OverviewTab'), { ssr: false, loading: LoadingView })

// Fase 2: las vistas se montan DONDE ESTÁN, sin mover una carpeta. Los imports apuntan a
// stratix-mkt a propósito — la mudanza es la fase 3 y así este PR se puede revertir solo.
const tabViews: Record<string, JSX.Element> = {
  overview: <OverviewTab />,
  kanban: <KanbanTab />,
  solicitudes: <SolicitudesTab />,
  reporte: <ReporteTab />,
}

export default function TasksContent() {
  const { mktTab, setMktTab } = useStratix()

  return (
    <ModuloTabs<TasksTab> panel="tasks" titulo="Tasks" tabs={TASKS_TABS} activa={mktTab} onTab={setMktTab} vistas={tabViews}>
      <ActivityDetailModal />
      <NewActivityModal />
    </ModuloTabs>
  )
}
