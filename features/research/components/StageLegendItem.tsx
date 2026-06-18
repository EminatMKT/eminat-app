import { RESEARCH_THEME } from '../theme'

export default function StageLegendItem({ name, value, color }: { name: string; value: number; color: string }) {
  const { t3 } = RESEARCH_THEME
  return (
    <span style={{ fontSize: 9, display: 'flex', alignItems: 'center', gap: 3 }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: color }} />
      <span style={{ color: t3 }}>{name} ({value})</span>
    </span>
  )
}
