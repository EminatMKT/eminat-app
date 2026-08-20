'use client'
import { useApp, MESES } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import ReportTableRow from '../ReportTableRow'

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
  const { s1, s2, border, accent, t1, t3, inputStyle, esAdmin, miembrosAsignables, miembrosPorId } = useApp()
  const { t } = useT()
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
      <div id="print-header" style={{ display: 'none', textAlign: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #333' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#111' }}>{t('stratix.report.brand')}</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: '#333' }}>{t('stratix.report.title')}</div>
      </div>
      <div id="reporte-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>{t('stratix.report.title')}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {esAdmin && (
            <select value={miembroReporte} onChange={e => setMiembroReporte(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px' }}>
              <option value="">{t('common.select')}</option>
              {miembrosAsignables.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          )}
          <select value={mesReporte} onChange={e => setMesReporte(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px' }}>
            {MESES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={handlePrintReport} style={{ padding: '7px 14px', borderRadius: 8, background: accent, color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t('stratix.report.print')}</button>
        </div>
      </div>
      <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>{t('stratix.report.heading')}</div>
            <div style={{ fontSize: 12, color: t3 }}>{t('stratix.report.subheading')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: t3 }}>{t('stratix.report.period')}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{mesReporte} 2026</div>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${border}`, paddingTop: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>{t('stratix.report.teamMember')}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t1 }}>{nombreRep}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
          {summary.map(s => (
            <div key={s.label} style={{ background: s2, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: t3, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: s2 }}>
              {REPORT_HEADERS.map(clave => (
                <th key={clave} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{t(clave)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actsRep.map(a => (
              <ReportTableRow key={a.id} a={a} responsable={miembrosPorId[a.responsable_id ?? ''] ?? '—'} />
            ))}
          </tbody>
        </table>
        {actsRep.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>{t('stratix.report.empty')}</div>}
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }}>
          <div style={{ textAlign: 'center' }}><div style={{ borderTop: `1px solid ${border}`, paddingTop: 8, fontSize: 11, color: t3 }}>{t('stratix.report.signMember')}</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ borderTop: `1px solid ${border}`, paddingTop: 8, fontSize: 11, color: t3 }}>{t('stratix.report.signCoordinator')}</div></div>
        </div>
      </div>
    </div>
  )
}
