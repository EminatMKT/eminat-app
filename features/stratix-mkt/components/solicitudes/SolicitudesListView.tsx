'use client'
import { useApp, ESTADO_COLORS } from '@/shared/context/AppContext'
import { useStratix } from '../StratixContext'
import TaskTableRow from './TaskTableRow'

const ESTADOS_FILTRO = ['All', 'Pendiente', 'En proceso', 'Por aprobar', 'Completado']

export default function SolicitudesListView() {
  const { s1, s2, border, accent, t2, t3, inputStyle, esAdmin } = useApp()
  const { busquedaSol, setBusquedaSol, filtroEstadoSol, setFiltroEstadoSol, actsFiltradasSol } = useStratix()
  const headers = ['Title', 'Brand', ...(esAdmin ? ['Assignee'] : []), 'Month', 'Hours', 'Status', 'Due', 'Drive']
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Search by title, area..." value={busquedaSol} onChange={e => setBusquedaSol(e.target.value)} style={{ ...inputStyle, width: 280 }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ESTADOS_FILTRO.map(e => (
            <button key={e} onClick={() => setFiltroEstadoSol(e)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, border: `1px solid ${filtroEstadoSol === e ? ESTADO_COLORS[e] || accent : border}`, background: filtroEstadoSol === e ? `${ESTADO_COLORS[e] || accent}20` : 'transparent', color: filtroEstadoSol === e ? ESTADO_COLORS[e] || accent : t2, cursor: 'pointer' }}>{e}</button>
          ))}
        </div>
      </div>
      <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: s2 }}>
                {headers.map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {actsFiltradasSol.map(a => (
                <TaskTableRow key={a.id} a={a} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
