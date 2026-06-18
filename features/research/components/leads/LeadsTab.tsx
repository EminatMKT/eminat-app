'use client'
import { RESEARCH_THEME, selectStyle } from '../../theme'
import { PIPELINE_COLS } from '../../constants'
import { useResearch } from '../ResearchContext'
import LeadRow from './LeadRow'

export default function LeadsTab() {
  const { s1, s2, border, t3 } = RESEARCH_THEME
  const { filters, setFilters, filteredLeads, uniqueVals, countryData } = useResearch()
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filters.stage} onChange={e => setFilters(p => ({ ...p, stage: e.target.value }))} style={selectStyle}>
          <option value="">All Stages</option>
          {PIPELINE_COLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.phase} onChange={e => setFilters(p => ({ ...p, phase: e.target.value }))} style={selectStyle}>
          <option value="">All Phases</option>
          {[1, 2, 3, 4].map(p => <option key={p} value={String(p)}>Phase {p}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} style={selectStyle}>
          <option value="">All Statuses</option>
          {uniqueVals('status').map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.country} onChange={e => setFilters(p => ({ ...p, country: e.target.value }))} style={selectStyle}>
          <option value="">All Countries</option>
          {Object.keys(countryData).sort().map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.sponsor} onChange={e => setFilters(p => ({ ...p, sponsor: e.target.value }))} style={selectStyle}>
          <option value="">All Sponsors</option>
          {uniqueVals('lead_sponsor').map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => setFilters({ stage: '', phase: '', status: '', country: '', sponsor: '' })} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: t3, fontSize: 11, cursor: 'pointer' }}>✕ Clear</button>
        <span style={{ fontSize: 11, color: t3, marginLeft: 'auto' }}>{filteredLeads.length} results</span>
      </div>
      <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 1200 }}>
            <thead><tr style={{ background: s2 }}>
              {['Date', 'Conditions', 'NCT#', 'Title', 'Phase', 'Status', 'Countries', 'Sponsor', 'Contact', 'Email', 'Stage', 'Follow-up', 'Actions'].map(h =>
                <th key={h} style={{ padding: '9px 10px', textAlign: 'left', fontSize: 9, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400, whiteSpace: 'nowrap' }}>{h}</th>
              )}
            </tr></thead>
            <tbody>{filteredLeads.map(l => <LeadRow key={l.id} lead={l} />)}</tbody>
          </table>
        </div>
        {filteredLeads.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>No leads found</div>}
      </div>
    </div>
  )
}
