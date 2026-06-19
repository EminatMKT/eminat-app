'use client'
import { RESEARCH_THEME } from '../../theme'
import { useResearch } from '../ResearchContext'
import StatCard from '../StatCard'
import OpportunityRow from './OpportunityRow'

export default function OportunidadesTab() {
  const { s1, s2, border, t3 } = RESEARCH_THEME
  const { leads } = useResearch()
  const opps = leads.filter(l => ['Awarded', 'Negociación'].includes(l.stage || ''))
  const totalEstimado = opps.reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0)
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        <StatCard label="Pipeline Total" value={opps.length} color="#60A5FA" />
        <StatCard label="Total Awarded" value={opps.filter(l => l.stage === 'Awarded').length} color="#34D399" />
        <StatCard label="Estimated Value" value={`$${totalEstimado.toLocaleString()}`} color="#FBB040" />
      </div>
      <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ background: s2 }}>
            {['NCT#', 'Title', 'Sponsor', 'Stage', 'Estimated Value', 'Countries', 'Date'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>)}
          </tr></thead>
          <tbody>{opps.map(l => <OpportunityRow key={l.id} lead={l} />)}</tbody>
        </table>
        {opps.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>No active opportunities</div>}
      </div>
    </div>
  )
}
