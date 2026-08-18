'use client'
import { RESEARCH_THEME } from '../../theme'
import { useT } from '@/shared/i18n'
import type { CounterChange } from '../../utils/importPlan'

// Una fila del preview de contadores del import: qué NCT#, de cuánto a cuánto, y el tilde
// para dejarlo como está. Destildar descarta SOLO el contador de ese lead — el resto de sus
// columnas se importa igual.
export default function CounterChangeRow({ change, apply, onToggle }: {
  change: CounterChange
  apply: boolean
  onToggle: () => void
}) {
  const { border, t2, t3, accent, warn } = RESEARCH_THEME
  const { t } = useT()
  const dim = apply ? 1 : 0.45

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderBottom: `1px solid ${border}`, cursor: 'pointer', opacity: dim }}>
      <input type="checkbox" checked={apply} onChange={onToggle} style={{ width: 15, height: 15, accentColor: accent }} />
      <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: accent, minWidth: 96 }}>{change.nct}</span>
      <span style={{ fontSize: 10, color: t3 }}>{t('research.import.counterFrom')}</span>
      <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: t2 }}>{change.from ?? '—'}</span>
      <span style={{ fontSize: 11, color: t3 }}>→</span>
      <span style={{ fontSize: 10, color: t3 }}>{t('research.import.counterTo')}</span>
      <span style={{ fontFamily: 'DM Mono', fontSize: 11, fontWeight: 700, color: apply ? warn : t2 }}>{change.to}</span>
    </label>
  )
}
