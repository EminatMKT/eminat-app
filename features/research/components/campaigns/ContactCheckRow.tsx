import { RESEARCH_THEME } from '../../theme'

type Props = {
  checked: boolean
  onToggle: () => void
  primary: React.ReactNode
  secondary: React.ReactNode
  right?: React.ReactNode
  highlight?: boolean
}

export default function ContactCheckRow({ checked, onToggle, primary, secondary, right, highlight }: Props) {
  const { border, t1, t3, accent } = RESEARCH_THEME
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: `1px solid ${border}`, cursor: 'pointer', background: highlight && checked ? `${accent}06` : 'transparent' }}>
      <input type="checkbox" checked={checked} onChange={onToggle} style={{ accentColor: accent }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{primary}</div>
        <div style={{ fontSize: 10, color: t3 }}>{secondary}</div>
      </div>
      {right}
    </label>
  )
}
