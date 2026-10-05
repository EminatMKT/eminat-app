'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { estadoLabel } from '@/shared/constants/domain'
import { localMonth } from '@/shared/utils'
import s from '../ReporteTab/index.module.css'

type Row = { id: string; titulo: string; empresa: string; estado: string; fecha_inicio: string; fecha_entrega: string | null }

// Worker view consumes only the self-scoped server report. It never receives hours,
// production days, rankings or other users' rows from this endpoint.
export default function WorkerReport() {
  const { t } = useT()
  const { usuario } = useApp()
  const [month, setMonth] = useState(localMonth)
  const [tasks, setTasks] = useState<Row[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    if (!usuario?.id) return
    const controller = new AbortController()
    fetch(`/api/tasks/report?month=${encodeURIComponent(month)}`, { signal: controller.signal })
      .then(async r => { if (!r.ok) throw new Error((await r.json()).error || 'Error'); return r.json() })
      .then(result => { setTasks(result.tasks); setError('') })
      .catch(err => { if (err.name !== 'AbortError') setError(err.message) })
    return () => controller.abort()
  }, [usuario?.id, month])
  return <div id="reporte-content">
    <div id="reporte-controls" className={s.controles}>
      <label>{t('stratix.report.period')} <input aria-label={t('stratix.report.period')} type="month" value={month} onChange={e => setMonth(e.target.value)} className={s.select} /></label>
    </div>
    <div className={s.hoja}>
      <div className={s.head}><div><div className={s.titulo}>{t('tasks.report.mineTitle')}</div><div className={s.sub}>{t('tasks.report.mineSub')}</div></div></div>
      {error && <p role="alert">{error}</p>}
      <div className={s.resumen}>
        <div>{t('stratix.report.totalTasks')}: <strong>{tasks.length}</strong></div>
        <div>{t('stratix.report.completed')}: <strong>{tasks.filter(task => task.estado === 'Completado').length}</strong></div>
      </div>
      <table className={s.tabla}><thead><tr className={s.encabezado}>
        {(['stratix.report.colTask','stratix.report.colArea','stratix.report.colStatus','tasks.report.deadline'] as const).map(key => <th key={key} className={s.th}>{t(key)}</th>)}
      </tr></thead><tbody>{tasks.map(task => <tr key={task.id}><td className={s.workerCell}>{task.titulo}</td><td className={s.workerCell}>{task.empresa}</td><td className={s.workerCell}>{estadoLabel(task.estado, t)}</td><td className={s.workerCell}>{task.fecha_entrega || '—'}</td></tr>)}</tbody></table>
      {!tasks.length && !error && <div className={s.vacio}>{t('stratix.report.empty')}</div>}
    </div>
  </div>
}
