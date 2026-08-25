'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT, type I18nKey } from '@/shared/i18n'
import type { Actividad } from '@/features/stratix-mkt/types'
import TaskTableRow from '@/features/stratix-mkt/components/solicitudes/TaskTableRow'
import s from './index.module.css'

// La tabla de tareas, sin filtros ni contexto: recibe qué listar y nada más.
// Vivía dentro de SolicitudesListView, mezclada con su buscador y sus pills. Se extrajo
// cuando el aviso del Gantt necesitó listar las tareas fuera de rango: copiar el markup
// habría dejado dos tablas que se arreglan por separado (el problema de los tres StatCard).
const COLS: I18nKey[] = ['stratix.col.title', 'stratix.col.brand', 'stratix.col.month',
  'stratix.col.hours', 'stratix.col.status', 'stratix.col.due', 'stratix.col.drive']

type Props = {
  acts: Actividad[]
}

export default function TaskTable({ acts }: Props) {
  const { esAdmin } = useApp()
  const { t } = useT()
  // La columna de responsable solo existe para admin: el resto ve únicamente lo suyo.
  const cols = esAdmin ? [COLS[0], COLS[1], 'stratix.col.assignee' as I18nKey, ...COLS.slice(2)] : COLS
  return (
    <div className={s.marco}>
      <div className={s.visor}>
        <table className={s.tabla}>
          <thead>
            <tr className={s.encabezado}>
              {cols.map(c => <th key={c} className={s.th}>{t(c)}</th>)}
            </tr>
          </thead>
          <tbody>
            {acts.map(a => <TaskTableRow key={a.id} a={a} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
