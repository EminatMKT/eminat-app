'use client'
import { RESEARCH_THEME } from '../theme'
import { useResearch } from './ResearchContext'
import StageBadge from './StageBadge'
import type { Lead } from '../types'

export default function LeadRow({ lead: l }: { lead: Lead }) {
  const { border, t1, t2, t3, accent } = RESEARCH_THEME
  const { setModalLead, openEditLead, setModalActivity } = useResearch()
  return (
    <tr style={{ borderBottom: `1px solid ${border}` }}>
      <td style={{ padding: '7px 10px', color: t3, fontSize: 10, whiteSpace: 'nowrap' }}>{l.date_added || '—'}</td>
      <td style={{ padding: '7px 10px', color: t2, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.conditions || '—'}</td>
      <td style={{ padding: '7px 10px', color: accent, fontFamily: 'DM Mono', fontSize: 10 }}>{l.nct || '—'}</td>
      <td style={{ padding: '7px 10px', color: t1, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{l.official_title || '—'}</td>
      <td style={{ padding: '7px 10px', textAlign: 'center' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${accent}20`, color: accent, fontWeight: 600 }}>{l.phase || '—'}</span></td>
      <td style={{ padding: '7px 10px', color: t2, fontSize: 10 }}>{l.status || '—'}</td>
      <td style={{ padding: '7px 10px', color: t2, fontSize: 10, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.countries || '—'}</td>
      <td style={{ padding: '7px 10px', color: t2, fontSize: 10, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.lead_sponsor || '—'}</td>
      <td style={{ padding: '7px 10px', color: t2, fontSize: 10 }}>{l.contact_name || '—'}</td>
      <td style={{ padding: '7px 10px', color: '#60A5FA', fontSize: 10 }}>{l.email || '—'}</td>
      <td style={{ padding: '7px 10px' }}><StageBadge stage={l.stage} /></td>
      <td style={{ padding: '7px 10px', color: t3, fontSize: 10, whiteSpace: 'nowrap' }}>{l.next_followup || '—'}</td>
      <td style={{ padding: '7px 10px' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setModalLead(l)} style={{ padding: '3px 6px', borderRadius: 6, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 10, cursor: 'pointer' }} title="View">👁</button>
          <button onClick={() => openEditLead(l)} style={{ padding: '3px 6px', borderRadius: 6, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 10, cursor: 'pointer' }} title="Edit">✏️</button>
          <button onClick={() => setModalActivity(l)} style={{ padding: '3px 6px', borderRadius: 6, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 10, cursor: 'pointer' }} title="Activity">📞</button>
        </div>
      </td>
    </tr>
  )
}
