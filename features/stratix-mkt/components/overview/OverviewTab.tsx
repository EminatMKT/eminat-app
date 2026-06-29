'use client'
import { useApp } from '@/shared/context/AppContext'
import { StaggerGrid } from '@/shared/motion'
import { useStratix } from '../StratixContext'
import TrimestreSelector from './TrimestreSelector'
import OverviewKpiCard from './OverviewKpiCard'
import MonthBar from './MonthBar'
import BrandBar from './BrandBar'
import TeamOnlineRow from './TeamOnlineRow'
import RecentActivityRow from './RecentActivityRow'
import TeamRankRow from './TeamRankRow'

export default function OverviewTab() {
  const { s1, border, accent, t1, t3, onlineCount } = useApp()
  const {
    trimestre, totalQ, completadasQ, enProcesoQ, pendientesQ, pctCompletado, totalHoras, totalDias,
    diasRestantes, horasDisponibles, datosPorMes, maxTotal, datosPorMarca, maxMarca,
    equipoSinMi, actsFiltradas, datosPorMiembro, maxMiembro, setMktTab,
  } = useStratix()

  const kpis = [
    { label: 'Total Tasks', value: totalQ, color: accent, sub: 'tasks' },
    { label: 'Completed', value: completadasQ, color: '#34D399', sub: `${pctCompletado}% completion rate` },
    { label: 'In Progress', value: enProcesoQ, color: '#FBB040', sub: 'in progress' },
    { label: 'Pending', value: pendientesQ, color: '#9494B3', sub: 'not started' },
    { label: 'Total Hours', value: `${totalHoras}h`, color: '#F472B6', sub: `${totalDias} prod. days` },
    { label: 'Available Hours', value: `${horasDisponibles}h`, color: '#60A5FA', sub: `${diasRestantes} days remaining` },
  ]
  const recientes = actsFiltradas.slice(0, 6)

  return (
    <div>
      <TrimestreSelector />
      <StaggerGrid style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 14 }}>
        {kpis.map(k => (
          <OverviewKpiCard key={k.label} kpi={k} pctCompletado={pctCompletado} />
        ))}
      </StaggerGrid>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 270px', gap: 12, marginBottom: 14 }}>
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Production by month — {trimestre}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 90 }}>
            {datosPorMes.map(d => (
              <MonthBar key={d.mes} d={d} maxTotal={maxTotal} />
            ))}
          </div>
        </div>
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>By brand — {trimestre}</div>
          {datosPorMarca.map(m => (
            <BrandBar key={m.codigo} m={m} maxMarca={maxMarca} />
          ))}
        </div>
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Stratix 360 Today</div>
            <span style={{ fontSize: 10, color: '#34D399' }}>{onlineCount > 0 ? onlineCount : 1} online</span>
          </div>
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {equipoSinMi.map(u => (
              <TeamOnlineRow key={u.id} u={u} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 270px', gap: 12 }}>
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Recent activity</div>
            <button onClick={() => setMktTab('solicitudes')} style={{ fontSize: 10, color: accent, background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
          </div>
          {recientes.map(a => (
            <RecentActivityRow key={a.id} a={a} />
          ))}
        </div>
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Team ranking</div>
          </div>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {datosPorMiembro.map((m, i) => (
              <TeamRankRow key={m.ref} m={m} i={i} maxMiembro={maxMiembro} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
