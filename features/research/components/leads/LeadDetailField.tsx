import { RESEARCH_THEME } from '../../theme'
import type { LeadFieldDef } from '../../fields'

export default function LeadDetailField({ def, value }: { def: LeadFieldDef; value: any }) {
  const { s2, t1, t3 } = RESEARCH_THEME
  const display = def.type === 'checkbox' ? (value === true || value === 'true' ? 'Sí' : 'No') : value
  return (
    <div style={def.fullWidth ? { gridColumn: '1 / -1' } : undefined}>
      <div style={{ fontSize: 10, color: t3, marginBottom: 3 }}>{def.label}</div>
      <div style={{ fontSize: 12, color: t1, fontWeight: 500, padding: '6px 10px', background: s2, borderRadius: 8, minHeight: 30, wordBreak: 'break-word' }}>{display || '—'}</div>
    </div>
  )
}
