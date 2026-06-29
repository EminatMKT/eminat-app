import { RESEARCH_THEME } from '../theme'
import StageBadge from './StageBadge'
import type { Lead } from '../types'

export default function RecentLeadItem({ lead: l }: { lead: Lead }) {
  const { border, t1, t3, accent } = RESEARCH_THEME
  return (
    <div style={{ padding: '8px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 10, color: accent, fontFamily: 'DM Mono', width: 80, flexShrink: 0 }}>{l.nct || '—'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.official_title || l.conditions || '—'}</div>
        <div style={{ fontSize: 9, color: t3 }}>{l.lead_sponsor} · {l.stage}</div>
      </div>
      <StageBadge stage={l.stage} />
    </div>
  )
}
