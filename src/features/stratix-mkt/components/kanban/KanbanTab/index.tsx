'use client'
import { COLUMNAS_KANBAN } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import NewButton from '@/shared/components/ui/NewButton'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import KanbanColumn from '../KanbanColumn'
import s from './index.module.css'
import { ESTADO } from '@/shared/constants/domain'

export default function KanbanTab() {
  const { t } = useT()
  const { mesKanban, setMesKanban, mesesDisponibles, actsKanban, setNuevaAct, setModalNuevaAct } = useStratix()
  return (
    <div>
      {/* La barra de la sección: el conteo a la izquierda, y a la derecha lo que opera sobre
          estas tarjetas — el filtro de mes y el alta. El alta vivía en el topbar, que es del
          shell y no de esta vista (ver .claude/rules/ui.md). Mismo NewButton que usa Admin. */}
      <div className={s.bar}>
        <div className={s.hint}>{t('stratix.kanbanHint', { n: actsKanban.length })}</div>
        <div className={s.tools}>
          <select className={s.select} value={mesKanban} onChange={e => setMesKanban(e.target.value)}>
            <option value="">{t('stratix.allMonths')}</option>
            {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <NewButton label={t('stratix.newTask')} onClick={() => { setNuevaAct(p => ({ ...p, estado: ESTADO.PENDIENTE })); setModalNuevaAct(true) }} />
        </div>
      </div>
      <div className={s.board}>
        {COLUMNAS_KANBAN.map(col => (
          <KanbanColumn key={col} col={col} />
        ))}
      </div>
    </div>
  )
}
