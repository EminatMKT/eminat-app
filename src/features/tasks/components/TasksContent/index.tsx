'use client'
import dynamic from 'next/dynamic'
import { ModuloTabs } from '@/shared/components/shell'
import { LoadingView } from '@/shared/components/ui'
import { useTasks } from '../TasksContext'
import { useApp } from '@/shared/context/AppContext'
import KanbanTab from '../kanban/KanbanTab'
import SolicitudesTab from '../solicitudes/SolicitudesTab'
import ReporteTab from '../reporte/ReporteTab'
import ActivityDetailModal from '../modals/ActivityDetailModal'
import ProjectsTab from '../projects/ProjectsTab'
import NewActivityModal from '../modals/NewActivityModal'
import { visibleTasksTabs, type TasksTab } from '@/features/tasks/constants/tabs'

// La única que arrastra recharts —por los cards del tablero— y además monta el Gantt. Las otras
// tres son tablas y tarjetas: envolverlas agregaría un chunk y un viaje de red a cambio de nada.
const OverviewTab = dynamic(() => import('../overview/OverviewTab'), { ssr: false, loading: LoadingView })

const tabViews: Record<string, JSX.Element> = {
  overview: <OverviewTab />,
  kanban: <KanbanTab />,
  solicitudes: <SolicitudesTab />,
  projects: <ProjectsTab />,
  reporte: <ReporteTab />,
}

export default function TasksContent() {
  const { tabActiva, setTabActiva } = useTasks()
  const { esAdmin } = useApp()
  const allowedTabs = visibleTasksTabs(esAdmin)

  return (
    <ModuloTabs<TasksTab> panel="tasks" titulo="Tasks" tabs={allowedTabs} activa={tabActiva} onTab={setTabActiva} vistas={tabViews}>
      <ActivityDetailModal />
      <NewActivityModal />
    </ModuloTabs>
  )
}
