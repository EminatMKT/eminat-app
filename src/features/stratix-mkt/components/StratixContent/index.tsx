'use client'
import AppShell from '@/shared/components/shell/AppShell'
import { SUB_ITEMS } from '@/shared/components/shell/appShellConfig'
import { PageTransition } from '@/shared/motion'
import { useStratix } from '../StratixContext'
import StratixTabNav from '../StratixTabNav'
import OverviewTab from '../overview/OverviewTab'
import KanbanTab from '../kanban/KanbanTab'
import GanttTab from '../gantt/GanttTab'
import HorasTab from '../horas/HorasTab'
import SolicitudesTab from '../solicitudes/SolicitudesTab'
import Stratix360Roster from '../roster/Stratix360Roster'
import ReporteTab from '../reporte/ReporteTab'
import SocialTab from '../social/SocialTab'
import CompetenciaTab from '../competencia/CompetenciaTab'
import ActivityDetailModal from '../modals/ActivityDetailModal'
import NewActivityModal from '../modals/NewActivityModal'

// La barra horizontal es de Production. El tablero no la lleva: salió del grupo y es su propia
// sección del sidebar, así que mostrarle las pestañas de producción sería volver a mezclarlos.
const TAB_NAV_TABS = ['kanban', 'gantt', 'horas']

const tabViews: Record<string, JSX.Element> = {
  overview: <OverviewTab />,
  kanban: <KanbanTab />,
  gantt: <GanttTab />,
  horas: <HorasTab />,
  solicitudes: <SolicitudesTab />,
  // La sección Team ES el roster: no hay envoltorio en el medio (ver componentes.md).
  equipo: <Stratix360Roster />,
  reporte: <ReporteTab />,
  social: <SocialTab />,
  competencia: <CompetenciaTab />,
}

// El título sigue a la SECCIÓN abierta, no al módulo. Antes era fijo ("Stratix 360 —
// Producción") y con el tablero afuera de Production quedaba mintiendo: el sidebar decía
// Dashboard y el encabezado, Producción. Sale de SUB_ITEMS para que los dos digan lo mismo
// siempre, incluso si mañana se renombra una sección.
const sectionTitle = (tab: string) => {
  const item = SUB_ITEMS.mkt.find(i => (i.tabs ? i.tabs.includes(tab) : i.tab === tab))
  return item ? `Stratix 360 — ${item.label}` : 'Stratix 360'
}

export default function StratixContent() {
  const { mktTab, setMktTab } = useStratix()

  return (
    <AppShell title={sectionTitle(mktTab)} activeTab={mktTab} onTabChange={setMktTab}>
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
