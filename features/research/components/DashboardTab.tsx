'use client'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { RESEARCH_THEME } from '../theme'
import { PIPELINE_COLORS, CHART_COLORS } from '../constants'
import { useResearch } from './ResearchContext'
import StatCard from './StatCard'
import CountryChip from './CountryChip'
import RecentLeadItem from './RecentLeadItem'

export default function DashboardTab() {
  const { s1, border, t1, t3, accent } = RESEARCH_THEME
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
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Pipeline by Stage</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={stageData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
              {stageData.map((d, i) => <Cell key={i} fill={PIPELINE_COLORS[d.name] || CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie><Tooltip contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} /></PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
            {stageData.map(d => <span key={d.name} style={{ fontSize: 9, display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: PIPELINE_COLORS[d.name] || accent }} /><span style={{ color: t3 }}>{d.name} ({d.value})</span></span>)}
          </div>
        </div>
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Leads by Phase</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={phaseData}><XAxis dataKey="name" tick={{ fontSize: 10, fill: t3 }} /><YAxis tick={{ fontSize: 10, fill: t3 }} /><Tooltip contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} /><Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {phaseData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
            </Bar></BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Top Sponsors</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sponsorData} layout="vertical"><XAxis type="number" tick={{ fontSize: 9, fill: t3 }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 8, fill: t3 }} width={120} /><Tooltip contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} /><Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {sponsorData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar></BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, fontSize: 12, fontWeight: 600, color: t1 }}>Recently added leads</div>
          {leads.slice(0, 5).map(l => <RecentLeadItem key={l.id} lead={l} />)}
          {leads.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: t3, fontSize: 12 }}>No leads</div>}
        </div>
      </div>
    </div>
  )
}
