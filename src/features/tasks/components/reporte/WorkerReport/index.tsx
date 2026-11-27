'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { ESTADO } from '@/shared/constants/domain'
import { Button, LoadingView } from '@/shared/components/ui'
import useWorkerReport from '@/features/tasks/hooks/useWorkerReport'
import WorkerTableRow from '../WorkerTableRow'
import s from '../ReporteTab/index.module.css'

const REPORT_HEADERS = [
  'stratix.report.colTask',
  'stratix.report.colArea',
  'stratix.report.colStatus',
  'tasks.report.deadline',
] as const

/**
 * Worker view consumes only the self-scoped server report. It never receives hours,
 * production days, rankings or other users' rows from this endpoint. Printing keeps the same
 * boundary: `printWorkerReport` only ever sees this user's own rows.
 */
export default function WorkerReport() {
  const { t, intlLocale } = useT()
  const { usuario } = useApp()
  const { period, report, handlePrint } = useWorkerReport(usuario, intlLocale, t)
  const { month, setMonth } = period
  const { tasks, error, loading } = report

  if (loading) return <LoadingView />

  return <div id="reporte-content">
    <div id="reporte-controls" className={s.controles}>
      <label>{t('stratix.report.period')} <input aria-label={t('stratix.report.period')} type="month" value={month} onChange={e => setMonth(e.target.value)} className={s.select} /></label>
    </div>
    <div className={s.hoja}>
      <div className={s.head}>
        <div><div className={s.titulo}>{t('tasks.report.mineTitle')}</div><div className={s.sub}>{t('tasks.report.mineSub')}</div></div>
        <div className={s.imprimirCabeza}><Button kind="print" onClick={handlePrint} /></div>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className={s.resumen}>
        <div>{t('stratix.report.totalTasks')}: <strong>{tasks.length}</strong></div>
        <div>{t('stratix.report.completed')}: <strong>{tasks.filter(task => task.estado === ESTADO.COMPLETADO).length}</strong></div>
      </div>
      <table className={s.tabla}><thead><tr className={s.encabezado}>
        {REPORT_HEADERS.map(key => <th key={key} className={s.th}>{t(key)}</th>)}
      </tr></thead><tbody>{tasks.map(task => <WorkerTableRow key={task.id} task={task} />)}</tbody></table>
      {!tasks.length && !error && <div className={s.vacio}>{t('stratix.report.empty')}</div>}
    </div>
  </div>
}

// This file renders the signed-in worker's own report: period picker, print button, task
// count/completed summary and the table of their tasks, one WorkerTableRow per task.
