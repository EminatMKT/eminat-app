'use client'
import type { CSSProperties } from 'react'
import { ESTADO_COLORS } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import KanbanTaskCard from '../KanbanTaskCard'
import s from './index.module.css'
import { ESTADO, estadoLabel } from '@/shared/constants/domain'

export default function KanbanColumn({ col }: { col: string }) {
  const { t } = useT()
  const { dragOver, onDragOverCol, onDrop, porColumna, setNuevaAct, setModalNuevaAct } = useStratix()
  const cards = porColumna(col)
  const over = dragOver === col
  return (
    <div className={`${s.col} ${over ? s.over : ''}`} style={{ '--estado': ESTADO_COLORS[col] } as CSSProperties}
      onDragOver={e => { e.preventDefault(); onDragOverCol(col) }} onDrop={() => onDrop(col)}>
      <div className={s.head}>
        <div className={s.title}>
          <div className={s.dot} />
          <span className={s.name}>{estadoLabel(col, t)}</span>
        </div>
        <span className={s.count}>{cards.length}</span>
      </div>
      <div className={s.cards}>
        {cards.map(a => <KanbanTaskCard key={a.id} a={a} />)}
        {col === ESTADO.PENDIENTE && (
          <button className={s.add} onClick={() => { setNuevaAct(p => ({ ...p, estado: ESTADO.PENDIENTE })); setModalNuevaAct(true) }}>
            <span className={s.plus}>+</span> {t('stratix.addTask')}
          </button>
        )}
        {cards.length === 0 && col !== ESTADO.PENDIENTE && (
          <div className={s.drop}>{t('stratix.dropHere')}</div>
        )}
      </div>
    </div>
  )
}
