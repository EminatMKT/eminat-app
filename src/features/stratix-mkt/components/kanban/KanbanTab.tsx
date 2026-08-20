'use client'
import { useApp, COLUMNAS_KANBAN } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import NewButton from '@/shared/components/ui/NewButton'
import { useStratix } from '../StratixContext'
import KanbanColumn from './KanbanColumn'

export default function KanbanTab() {
  const { t3, inputStyle } = useApp()
  const { t } = useT()
  const { mesKanban, setMesKanban, mesesDisponibles, actsKanban, setNuevaAct, setModalNuevaAct } = useStratix()
  return (
    <div>
      {/* La barra de la sección: el conteo a la izquierda, y a la derecha lo que opera sobre
          estas tarjetas — el filtro de mes y el alta. El alta vivía en el topbar, que es del
          shell y no de esta vista (ver .claude/rules/ui.md). Mismo NewButton que usa Admin. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: t3 }}>{t('stratix.kanbanHint', { n: actsKanban.length })}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select value={mesKanban} onChange={e => setMesKanban(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px' }}>
            <option value="">{t('stratix.allMonths')}</option>
            {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <NewButton label={t('stratix.newTask')} onClick={() => { setNuevaAct(p => ({ ...p, estado: 'Pendiente' })); setModalNuevaAct(true) }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, alignItems: 'start' }}>
        {COLUMNAS_KANBAN.map(col => (
          <KanbanColumn key={col} col={col} />
        ))}
      </div>
    </div>
  )
}
