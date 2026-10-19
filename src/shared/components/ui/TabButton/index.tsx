'use client'
import { useApp } from '@/shared/context/AppContext'
import CountBubble from '../CountBubble'

const DEFAULT_PADDING = '8px 18px'

type Props = {
  label: string
  icon?: string
  soon?: boolean
  badge?: number
  active: boolean
  onClick: () => void
  padding?: string
}

/** A secondary tab button; `badge` draws a count bubble after the label, `padding` can be overridden. */
export default function TabButton(props: Props) {
  const { label, icon, soon, badge, active, onClick, padding = DEFAULT_PADDING } = props
  const { t1, t3, accent } = useApp()
  return (
    <button onClick={onClick}
      style={{ padding, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans', background: 'transparent', color: active ? t1 : t3, borderBottom: active ? `2px solid ${accent}` : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 6 }}>
      {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
      {label}
      {badge !== undefined && <CountBubble count={badge} />}
      {soon && <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 4, background: `${t3}30`, color: t3, fontFamily: 'DM Mono' }}>SOON</span>}
    </button>
  )
}

// The tab used by the underlined secondary tab bars (billing, medical, stratix). An optional count
// bubble flags work waiting behind a tab without the user having to open it.
