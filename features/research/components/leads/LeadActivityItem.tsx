import { RESEARCH_THEME } from '../../theme'
import type { Activity } from '../../types'

export default function LeadActivityItem({ activity: a }: { activity: Activity }) {
  const { border, t1, t3 } = RESEARCH_THEME
  return (
    <div style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${border}` }}>
      <span style={{ fontSize: 14 }}>{a.tipo === 'email' ? '📧' : a.tipo === 'llamada' ? '📞' : '🤝'}</span>
      <div><div style={{ fontSize: 11, color: t1 }}>{a.nota}</div><div style={{ fontSize: 9, color: t3 }}>{a.fecha}</div></div>
    </div>
  )
}
