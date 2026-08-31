'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { periodoLargo, periodosDisponibles } from '@/features/stratix-mkt/utils/periodo'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import StatBox from '@/shared/components/ui/StatBox'
import ReportTableRow from '../ReportTableRow'
import s from './index.module.css'

// La columna "Assignee" hace legible por qué las horas de las filas no cierran
// con el total: el reporte LISTA lo que la persona solicitó, pero solo SUMA lo
// que ejecuta. Sin ella, un documento que se firma para pagar mostraba filas con
// horas que el total ignoraba, sin nada que lo explicara.
const REPORT_HEADERS = [
  'stratix.report.colTask',
  'stratix.report.colArea',
  'stratix.report.colAssignee',
  'stratix.report.colHours',
  'stratix.report.colProdDays',
  'stratix.report.colStatus',
] as const

export default function ReporteTab() {
  const { accent, esAdmin, miembrosAsignables, miembrosPorId, actividades } = useApp()
  const { t, intlLocale } = useT()
  const {
    mesReporte, setMesReporte, miembroReporte, setMiembroReporte,
    actsRep, totalHorasRep, totalDiasRep, completadasRep, nombreRep, handlePrintReport,
  } = useStratix()

  const summary = [
    { label: t('stratix.report.totalTasks'), value: actsRep.length, color: accent },
    { label: t('stratix.report.completed'), value: completadasRep, color: '#34D399' },
    { label: t('stratix.report.totalHours'), value: `${totalHorasRep}h`, color: '#F472B6' },
    { label: t('stratix.report.prodDays'), value: totalDiasRep, color: '#60A5FA' },
  ]

  return (
    <div id="reporte-content">
      <div id="print-header" className={s.printHeader}>
        <div className={s.printMarca}>{t('stratix.report.brand')}</div>
        <div className={s.printTitulo}>{t('stratix.report.title')}</div>
      </div>
      <div id="reporte-controls" className={s.controles}>
        <span className={s.rotulo}>{t('stratix.report.title')}</span>
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
          <button type="button" className={s.imprimir} onClick={handlePrintReport}>{t('stratix.report.print')}</button>
        </div>
      </div>
      <div className={s.hoja}>
        <div className={s.head}>
          <div>
            <div className={s.titulo}>{t('stratix.report.heading')}</div>
            <div className={s.sub}>{t('stratix.report.subheading')}</div>
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
              <ReportTableRow key={a.id} a={a} responsable={miembrosPorId[a.responsable_id ?? ''] ?? '—'} />
            ))}
          </tbody>
        </table>
        {actsRep.length === 0 && <div className={s.vacio}>{t('stratix.report.empty')}</div>}
        <div className={s.firmas}>
          <div className={s.firma}><div className={s.linea}>{t('stratix.report.signMember')}</div></div>
          <div className={s.firma}><div className={s.linea}>{t('stratix.report.signCoordinator')}</div></div>
        </div>
      </div>
    </div>
  )
}
