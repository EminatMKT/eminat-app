'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT, type I18nKey } from '@/shared/i18n'
import PillToggle from '@/shared/components/ui/PillToggle'
import { COLUMNAS_KANBAN, ESTADO_COLORS, estadoLabel } from '@/shared/constants/domain'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import TaskTableRow from '../TaskTableRow'
import s from './index.module.css'

const TODOS = 'All'
const ESTADOS_FILTRO = [TODOS, ...COLUMNAS_KANBAN]
const COLS: I18nKey[] = ['stratix.col.title', 'stratix.col.brand', 'stratix.col.month',
  'stratix.col.hours', 'stratix.col.status', 'stratix.col.due', 'stratix.col.drive']

export default function SolicitudesListView() {
  const { esAdmin } = useApp()
  const { t } = useT()
  const { busquedaSol, setBusquedaSol, filtroEstadoSol, setFiltroEstadoSol, actsFiltradasSol } = useStratix()
  // La columna de responsable solo existe para admin: el resto ve únicamente lo suyo.
  const cols = esAdmin ? [COLS[0], COLS[1], 'stratix.col.assignee' as I18nKey, ...COLS.slice(2)] : COLS
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
      <div className={s.marco}>
        <div className={s.visor}>
          <table className={s.tabla}>
            <thead>
              <tr className={s.encabezado}>
                {cols.map(c => <th key={c} className={s.th}>{t(c)}</th>)}
              </tr>
            </thead>
            <tbody>
              {actsFiltradasSol.map(a => <TaskTableRow key={a.id} a={a} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
