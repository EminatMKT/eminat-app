'use client'
import { RESEARCH_THEME } from '../theme'
import { useResearch } from './ResearchContext'
import StatCard from './StatCard'
import CountryChip from './CountryChip'
import RecentLeadItem from './RecentLeadItem'
import StagePieChart from './StagePieChart'
import BarChartCard from './BarChartCard'

export default function DashboardTab() {
  const { s1, border, t1, t3 } = RESEARCH_THEME
  const { totalLeads, activeLeads, awarded, inNeg, stageData, phaseData, sponsorData, countrySorted, leads } = useResearch()

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <StatCard label="Total Leads" value={totalLeads} color="#60A5FA" />
        <StatCard label="Active Leads" value={activeLeads} color="#34D399" />
        <StatCard label="Awarded" value={awarded} color="#FBB040" />
        <StatCard label="In Negotiation" value={inNeg} color="#F87171" />
      </div>

      <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Leads by Country</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {countrySorted.map(([country, count]) => <CountryChip key={country} country={country} count={count} />)}
          {countrySorted.length === 0 && <span style={{ color: t3, fontSize: 12 }}>No country data</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <StagePieChart data={stageData} />
        <BarChartCard title="Leads by Phase" data={phaseData} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <BarChartCard title="Top Sponsors" data={sponsorData} vertical />
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, fontSize: 12, fontWeight: 600, color: t1 }}>Recently added leads</div>
          {leads.slice(0, 5).map(l => <RecentLeadItem key={l.id} lead={l} />)}
          {leads.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: t3, fontSize: 12 }}>No leads</div>}
        </div>
      </div>
    </div>
  )
}
