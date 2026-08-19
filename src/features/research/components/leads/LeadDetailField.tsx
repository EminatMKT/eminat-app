'use client'
import { RESEARCH_THEME } from '../../theme'
import { useT } from '@/shared/i18n'
import type { LeadFieldDef } from '../../utils/fields'

export default function LeadDetailField({ def, value }: { def: LeadFieldDef; value: string | number | boolean | null | undefined }) {
  const { s2, t1, t3 } = RESEARCH_THEME
  const { t } = useT()
  const display = def.type === 'checkbox' ? t(value === true || value === 'true' ? 'research.common.yes' : 'research.common.no') : value
  return (
    <div style={def.fullWidth ? { gridColumn: '1 / -1' } : undefined}>
      <div style={{ fontSize: 10, color: t3, marginBottom: 3 }}>{t(def.labelKey)}</div>
      <div style={{ fontSize: 12, color: t1, fontWeight: 500, padding: '6px 10px', background: s2, borderRadius: 8, minHeight: 30, wordBreak: 'break-word' }}>{display || '—'}</div>
    </div>
  )
}
