'use client'
import { RESEARCH_THEME } from '../../theme'
import { useT, type I18nKey } from '@/shared/i18n'
import type { StudyConflict } from '../../utils/clinicalTrials'

// Diálogo de resolución campo-por-campo: cuando el autocompletado NCT# traería valores
// distintos de los ya cargados, el usuario elige (checkbox) cuáles pisar. Sin marcar = conserva.
export default function NctConflictModal({ conflicts, labelByCol, picked, setPicked, onApply, onCancel }: {
  conflicts: StudyConflict[]
  labelByCol: Record<string, I18nKey>
  picked: Set<string>
  setPicked: (s: Set<string>) => void
  onApply: () => void
  onCancel: () => void
}) {
  const { s1, border, t1, t2, t3, accent } = RESEARCH_THEME
  const { t } = useT()

  const toggle = (col: string) => {
    const next = new Set(picked)
    next.has(col) ? next.delete(col) : next.add(col)
    setPicked(next)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }} onClick={e => { e.stopPropagation(); onCancel() }}>
      <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 24, width: 520, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: t1, marginBottom: 6 }}>{t('research.nct.conflictTitle')}</div>
        <div style={{ fontSize: 12, color: t3, marginBottom: 16 }}>{t('research.nct.conflictDesc')}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {conflicts.map(c => (
            <label key={c.column} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', border: `1px solid ${border}`, borderRadius: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={picked.has(c.column)} onChange={() => toggle(c.column)} style={{ marginTop: 3, accentColor: accent }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: t1, marginBottom: 3 }}>{t(labelByCol[c.column] ?? (c.column as I18nKey))}</div>
                <div style={{ fontSize: 11, color: t2, wordBreak: 'break-word' }}>
                  <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{String(c.current)}</span>
                  <span style={{ color: accent }}> → {String(c.incoming)}</span>
                </div>
              </div>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>{t('common.cancel')}</button>
          <button onClick={onApply} style={{ flex: 2, padding: '10px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('research.nct.apply')}</button>
        </div>
      </div>
    </div>
  )
}
