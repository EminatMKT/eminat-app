import { RESEARCH_THEME } from '../../theme'
import type { Campaign } from '../../types'

export default function SmsHistoryItem({ campaign: c }: { campaign: Campaign }) {
  const { border, t1, t3 } = RESEARCH_THEME
  return (
    <div style={{ padding: '8px 0', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between' }}>
      <div><div style={{ fontSize: 11, color: t1 }}>{c.nombre}</div><div style={{ fontSize: 9, color: t3 }}>{c.total_enviados} sent</div></div>
      <span style={{ fontSize: 9, color: '#34D399' }}>{c.estado}</span>
    </div>
  )
}
