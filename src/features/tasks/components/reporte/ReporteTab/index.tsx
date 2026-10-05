'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { periodoLargo, periodosDisponibles } from '@/features/tasks/utils/periodo'
import { useTasks } from '@/features/tasks/components/TasksContext'
import responsibleNames from '@/features/tasks/utils/responsables/label'
import Button from '@/shared/components/ui/Button'
import StatBox from '@/shared/components/ui/StatBox'
import ReportTableRow from '../ReportTableRow'
import s from './index.module.css'
import WorkerReport from '../WorkerReport'

const REPORT_HEADERS = [
  'stratix.report.colTask',
  'stratix.report.colArea',
  'stratix.report.colAssignee',
  'stratix.report.colStatus',
] as const

export default function ReporteTab() {
  const { esAdmin } = useApp()
  return esAdmin ? <AdminReport /> : <WorkerReport />
}

function AdminReport() {
  const { accent, esAdmin, miembrosAsignables, miembrosPorId, actividades } = useApp()
  const { t, intlLocale } = useT()
  const {
    mesReporte, setMesReporte, miembroReporte, setMiembroReporte,
    actsRep, completadasRep, nombreRep, handlePrintReport,
  } = useTasks()

  const summary = [
    { label: t('stratix.report.totalTasks'), value: actsRep.length, color: accent },
    { label: t('stratix.report.completed'), value: completadasRep, color: '#34D399' },
  ]

  return (
    <div id="reporte-content">
      <div id="print-header" className={s.printHeader}>
        <div className={s.printMarca}>{t('tasks.report.brand')}</div>
        <div className={s.printTitulo}>{t('tasks.report.title')}</div>
      </div>
      <div id="reporte-controls" className={s.controles}>
        <div className={s.acciones}>
          {esAdmin && (
            <select className={s.select} value={miembroReporte} onChange={e => setMiembroReporte(e.target.value)}>
              <option value="">{t('common.select')}</option>
              {miembrosAsignables.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          )}
          <select className={s.select} value={mesReporte} onChange={e => setMesReporte(e.target.value)}>
            {periodosDisponibles(actividades.map(a => a.fecha_inicio)).map(p => (
              <option key={p} value={p}>{periodoLargo(`${p}-01`, intlLocale)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className={s.hoja}>
        <div className={s.head}>
          <div>
            <div className={s.titulo}>{t('tasks.report.title')}</div>
            <div className={s.sub}>{t('tasks.report.subtitle')}</div>
          </div>
          <div className={s.imprimirCabeza}>
            <Button kind="print" onClick={handlePrintReport} />
          </div>
          <div className={s.periodo}>
            <div className={s.dato}>{t('stratix.report.period')}</div>
            {/* El año salía escrito a mano: esta hoja decía "Enero 2026" en 2027. Ahora sale
                del período, que es el mismo dato con el que se filtró el reporte. */}
            <div className={s.valor}>{periodoLargo(`${mesReporte}-01`, intlLocale)}</div>
          </div>
        </div>
        <div className={s.persona}>
          <div className={s.dato}>{t('stratix.report.teamMember')}</div>
          <div className={s.nombre}>{nombreRep}</div>
        </div>
        <div className={s.resumen}>
          {summary.map(item => <StatBox key={item.label} size="lg" label={item.label} value={item.value} color={item.color} />)}
        </div>
        <table className={s.tabla}>
          <thead>
            <tr className={s.encabezado}>
              {REPORT_HEADERS.map(clave => <th key={clave} className={s.th}>{t(clave)}</th>)}
            </tr>
          </thead>
          <tbody>
            {actsRep.map(a => (
              <ReportTableRow key={a.id} a={a} responsable={responsibleNames(a, miembrosPorId)} />
            ))}
          </tbody>
        </table>
        {actsRep.length === 0 && <div className={s.vacio}>{t('stratix.report.empty')}</div>}
      </div>
    </div>
  )
}
