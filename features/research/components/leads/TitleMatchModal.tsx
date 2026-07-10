'use client'
import { RESEARCH_THEME } from '../../theme'
import { useT } from '@/shared/i18n'
import { NCT_COLUMN } from '../../constants'

// Candidatos de ClinicalTrials.gov encontrados por título (para leads sin NCT#). El usuario
// elige cuál es su estudio → se rellena NCT# + campos (merge no destructivo, con confirmación).
export default function TitleMatchModal({ studies, onPick, onCancel }: {
  studies: Record<string, any>[]
  onPick: (study: Record<string, any>) => void
  onCancel: () => void
}) {
  const { s1, s2, border, t1, t2, t3, accent } = RESEARCH_THEME
  const { t } = useT()

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }} onClick={e => { e.stopPropagation(); onCancel() }}>
      <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 24, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: t1, marginBottom: 6 }}>{t('research.title.matchTitle')}</div>
        <div style={{ fontSize: 12, color: t3, marginBottom: 16 }}>{t('research.title.matchDesc')}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {studies.map(s => (
            <button key={s[NCT_COLUMN]} onClick={() => onPick(s)} style={{ textAlign: 'left', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 10, background: s2, cursor: 'pointer' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t1, marginBottom: 3 }}>{s.official_title || '—'}</div>
              <div style={{ fontSize: 11, color: t2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: accent, fontFamily: 'DM Mono' }}>{s[NCT_COLUMN]}</span>
                {s.phase && <span>· {s.phase}</span>}
                {s.recruitment_status && <span>· {s.recruitment_status}</span>}
                {s.lead_sponsor && <span>· {s.lead_sponsor}</span>}
              </div>
            </button>
          ))}
        </div>

        <button onClick={onCancel} style={{ width: '100%', padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>{t('research.title.none')}</button>
      </div>
    </div>
  )
}
