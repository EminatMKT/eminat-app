'use client'
import { RESEARCH_THEME } from '../../theme'
import { useResearch } from '../ResearchContext'
import StageBadge from '../StageBadge'
import type { Lead } from '../../types'

export default function OpportunityRow({ lead: l }: { lead: Lead }) {
  const { border, t1, t2, t3, accent } = RESEARCH_THEME
  const { setModalLead } = useResearch()
  return (
    <tr onClick={() => setModalLead(l)} style={{ borderBottom: `1px solid ${border}`, cursor: 'pointer' }}>
      <td style={{ padding: '9px 12px', color: accent, fontFamily: 'DM Mono', fontSize: 11 }}>{l.nct || '—'}</td>
      <td style={{ padding: '9px 12px', color: t1, fontWeight: 500, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.official_title || '—'}</td>
      <td style={{ padding: '9px 12px', color: t2 }}>{l.lead_sponsor || '—'}</td>
      <td style={{ padding: '9px 12px' }}><StageBadge stage={l.stage} /></td>
      <td style={{ padding: '9px 12px', color: '#FBB040', fontFamily: 'DM Mono', fontWeight: 600 }}>{l.valor_estimado ? `$${Number(l.valor_estimado).toLocaleString()}` : '—'}</td>
      <td style={{ padding: '9px 12px', color: t3, fontSize: 11 }}>{l.countries || '—'}</td>
      <td style={{ padding: '9px 12px', color: t3, fontSize: 10 }}>{l.date_added || '—'}</td>
    </tr>
  )
}
