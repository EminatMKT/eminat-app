import { useResearchTheme } from '../theme'
import { PIPELINE_COLORS } from '../constants'

// Badge de stage del pipeline (color por stage).
export default function StageBadge({ stage }: { stage?: string }) {
  const { t3 } = useResearchTheme()
  const color = PIPELINE_COLORS[stage || ''] || t3
  return (
    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: `${color}20`, color, fontWeight: 600, whiteSpace: 'nowrap' }}>{stage || '—'}</span>
  )
}
