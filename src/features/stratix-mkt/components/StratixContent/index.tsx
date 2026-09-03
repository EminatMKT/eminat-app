'use client'
import dynamic from 'next/dynamic'
import { ModuloTabs } from '@/shared/components/shell'
import { LoadingView } from '@/shared/components/ui'
import { useStratix } from '../StratixContext'
import Stratix360Roster from '../roster/Stratix360Roster'
import { STRATIX_TABS, type StratixTab } from '@/features/stratix-mkt/constants/tabs'

// Las dos que arrastran recharts —por los cards de `shared/components/dashboard`— se bajan al
// abrirse. Team es el roster: una lista, y envolverla agregaría un chunk y un viaje de red a
// cambio de nada.
//
// `ssr: false` porque las dos leen del contexto del cliente: no hay nada que prerenderizar.
const SocialTab = dynamic(() => import('../social/SocialTab'), { ssr: false, loading: LoadingView })
const CompetenciaTab = dynamic(() => import('../competencia/CompetenciaTab'), { ssr: false, loading: LoadingView })

// Sin modales: los dos que había (ficha y alta de tarea) se fueron con las tareas a `/tasks`.
// La sección Team ES el roster: no hay envoltorio en el medio (ver componentes.md).
const tabViews: Record<string, JSX.Element> = {
  social: <SocialTab />,
  competencia: <CompetenciaTab />,
  equipo: <Stratix360Roster />,
}

export default function StratixContent() {
  const { mktTab, setMktTab } = useStratix()

  return (
    <ModuloTabs<StratixTab> panel="mkt" titulo="Stratix 360" tabs={STRATIX_TABS} activa={mktTab} onTab={setMktTab} vistas={tabViews} />
  )
}
