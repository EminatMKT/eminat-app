import { useResearchTheme } from '../../theme'
import { FIELD_LABELS } from '../../constants'

const FULL_WIDTH = new Set(['official_title', 'notes', 'note'])

export default function LeadDetailField({ field, value }: { field: string; value: any }) {
  const { s2, t1, t3 } = useResearchTheme()
  return (
    <div style={FULL_WIDTH.has(field) ? { gridColumn: '1 / -1' } : undefined}>
      <div style={{ fontSize: 10, color: t3, marginBottom: 3 }}>{FIELD_LABELS[field]}</div>
      <div style={{ fontSize: 12, color: t1, fontWeight: 500, padding: '6px 10px', background: s2, borderRadius: 8, minHeight: 30, wordBreak: 'break-word' }}>{value || '—'}</div>
    </div>
  )
}
