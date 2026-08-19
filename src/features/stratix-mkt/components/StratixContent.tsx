'use client'
import { useApp } from '@/shared/context/AppContext'
import AppShell from '@/shared/components/AppShell'
import { PageTransition } from '@/shared/motion'
import { useStratix } from './StratixContext'
import StratixTabNav from './StratixTabNav'
import OverviewTab from './overview/OverviewTab'
import KanbanTab from './kanban/KanbanTab'
import GanttTab from './gantt/GanttTab'
import HorasTab from './horas/HorasTab'
import SolicitudesTab from './solicitudes/SolicitudesTab'
import EquipoTab from './equipo/EquipoTab'
import ReporteTab from './reporte/ReporteTab'
import SocialTab from './social/SocialTab'
import CompetenciaTab from './competencia/CompetenciaTab'
import ActivityDetailModal from './modals/ActivityDetailModal'
import NewActivityModal from './modals/NewActivityModal'

const TAB_NAV_TABS = ['overview', 'kanban', 'gantt', 'horas']

const tabViews: Record<string, JSX.Element> = {
  overview: <OverviewTab />,
  kanban: <KanbanTab />,
  gantt: <GanttTab />,
  horas: <HorasTab />,
  solicitudes: <SolicitudesTab />,
  equipo: <EquipoTab />,
  reporte: <ReporteTab />,
  social: <SocialTab />,
  competencia: <CompetenciaTab />,
}

export default function StratixContent() {
  const { accent } = useApp()
  const { mktTab, setMktTab, setNuevaAct, setModalNuevaAct } = useStratix()

  const actions = mktTab === 'kanban' ? (
    <button onClick={() => { setNuevaAct(p => ({ ...p, estado: 'Pendiente' })); setModalNuevaAct(true) }}
      style={{ padding: '7px 16px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 16 }}>+</span> New task
    </button>
  ) : undefined

  return (
    <AppShell activeTab={mktTab} onTabChange={setMktTab} actions={actions}>
      <PageTransition>
        <div>
          {TAB_NAV_TABS.includes(mktTab) && <StratixTabNav />}
          {tabViews[mktTab]}

          <ActivityDetailModal />
          <NewActivityModal />
        </div>
      </PageTransition>
    </AppShell>
  )
}
