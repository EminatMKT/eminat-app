'use client'
import { useApp, MESES } from '@/shared/context/AppContext'
import { useStratix } from '../StratixContext'
import { ACTIVE_MIEMBROS_REFS } from '../../team'
import ReportTableRow from './ReportTableRow'

const MIEMBROS_ENTRIES = Object.entries(ACTIVE_MIEMBROS_REFS)
const REPORT_HEADERS = ['Task', 'Area', 'Hours', 'Prod. Days', 'Status']

export default function ReporteTab() {
  const { s1, s2, border, accent, t1, t3, inputStyle, esSuperAdmin } = useApp()
  const {
    mesReporte, setMesReporte, miembroReporte, setMiembroReporte,
    actsRep, totalHorasRep, totalDiasRep, completadasRep, nombreRep, refRep, handlePrintReport,
  } = useStratix()

  const summary = [
    { label: 'Total tasks', value: actsRep.length, color: accent },
    { label: 'Completed', value: completadasRep, color: '#34D399' },
    { label: 'Total hours', value: `${totalHorasRep}h`, color: '#F472B6' },
    { label: 'Production days', value: totalDiasRep, color: '#60A5FA' },
  ]

  return (
    <div id="reporte-content">
      <div id="print-header" style={{ display: 'none', textAlign: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #333' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#111' }}>Stratix Solutions</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: '#333' }}>Production Payment Report</div>
      </div>
      <div id="reporte-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Production payment report</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {esSuperAdmin && (
            <select value={miembroReporte} onChange={e => setMiembroReporte(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px' }}>
              <option value="">Select</option>
              {MIEMBROS_ENTRIES.map(([ref, nombre]) => <option key={ref} value={ref}>{nombre}</option>)}
            </select>
          )}
          <select value={mesReporte} onChange={e => setMesReporte(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px' }}>
            {MESES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={handlePrintReport} style={{ padding: '7px 14px', borderRadius: 8, background: accent, color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Print</button>
        </div>
      </div>
      <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>Production Report</div>
            <div style={{ fontSize: 12, color: t3 }}>Stratix 360 — Marketing Agency of Eminat Group</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: t3 }}>Period</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{mesReporte} 2026</div>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${border}`, paddingTop: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Team member</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t1 }}>{nombreRep}</div>
          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>{refRep}</div>
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
              {REPORT_HEADERS.map(h => (
                <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actsRep.map(a => (
              <ReportTableRow key={a.id} a={a} />
            ))}
          </tbody>
        </table>
        {actsRep.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>No tasks for this period</div>}
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }}>
          <div style={{ textAlign: 'center' }}><div style={{ borderTop: `1px solid ${border}`, paddingTop: 8, fontSize: 11, color: t3 }}>Team member signature</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ borderTop: `1px solid ${border}`, paddingTop: 8, fontSize: 11, color: t3 }}>Coordinator signature</div></div>
        </div>
      </div>
    </div>
  )
}
