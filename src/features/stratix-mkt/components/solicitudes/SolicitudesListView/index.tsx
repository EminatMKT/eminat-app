'use client'
import { useT } from '@/shared/i18n'
import PillToggle from '@/shared/components/ui/PillToggle'
import { COLUMNAS_KANBAN, ESTADO_COLORS, estadoLabel } from '@/shared/constants/domain'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import TaskTable from '@/features/stratix-mkt/components/TaskTable'
import s from './index.module.css'

const TODOS = 'All'
const ESTADOS_FILTRO = [TODOS, ...COLUMNAS_KANBAN]
export default function SolicitudesListView() {
  const { t } = useT()
  const { busquedaSol, setBusquedaSol, filtroEstadoSol, setFiltroEstadoSol, actsFiltradasSol } = useStratix()
  return (
    <div>
      <div className={s.filtros}>
        <input className={s.buscar} type="text" placeholder={t('stratix.sol.search')}
          value={busquedaSol} onChange={e => setBusquedaSol(e.target.value)} />
        <div className={s.estados}>
          {ESTADOS_FILTRO.map(e => (
            <PillToggle key={e} size="sm" color={ESTADO_COLORS[e]}
              label={e === TODOS ? t('stratix.sol.all') : estadoLabel(e, t)}
              active={filtroEstadoSol === e} onClick={() => setFiltroEstadoSol(e)} />
          ))}
        </div>
      </div>
      <TaskTable acts={actsFiltradasSol} />
    </div>
  )
}
