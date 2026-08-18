'use client'
import { useState } from 'react'
import { RESEARCH_THEME, inputStyle } from '../../theme'
import { useT } from '@/shared/i18n'
import { useResearch } from '../ResearchContext'
import { nextCount } from '../../utils/counters'
import { coerceLeadValue } from '../../utils/fields'
import { COUNT_COLUMN } from '../../constants'

// Pop-up de confirmación del contador de correos. Existe por un motivo concreto que pidió
// Federico en la reunión del 12/08/2026: sin confirmación "se te va el dedo y se pierde la
// trazabilidad". Por eso el número no se escribe hasta apretar Guardar.
export default function EmailCountModal() {
  const { s1, s2, border, t1, t2, t3, accent } = RESEARCH_THEME
  const { t } = useT()
  const { modalCount, setModalCount, setEmailCount } = useResearch()
  const [draft, setDraft] = useState<string>('')
  const [saving, setSaving] = useState(false)

  if (!modalCount) return null
  const lead = modalCount
  const current = lead.email_count ?? null
  // El draft arranca vacío y cae al valor actual: así abrir y cerrar sin tocar nada no cambia nada.
  const shown = draft === '' ? (current ?? 0) : Number(draft)
  const parsed = coerceLeadValue(COUNT_COLUMN, draft === '' ? String(current ?? '') : draft)
  const invalid = draft !== '' && parsed === null
  const close = () => { setDraft(''); setModalCount(null) }

  async function save() {
    if (invalid || parsed === null) return
    setSaving(true)
    const ok = await setEmailCount(lead.id, parsed)
    setSaving(false)
    if (ok) close()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={close}>
      <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 400, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>{t('research.count.title')}</div>
          <button onClick={close} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize: 11, color: t3, marginBottom: 18 }}>
          <strong style={{ color: accent, fontFamily: 'DM Mono' }}>{lead.nct_number || lead.official_title}</strong>
        </div>

        <div style={{ background: s2, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: t3, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'DM Mono', marginBottom: 6 }}>{t('research.count.current')}</div>
          <div style={{ fontFamily: 'Syne', fontSize: 34, fontWeight: 800, color: current === null && draft === '' ? t3 : accent }}>{shown}</div>
          {current === null && draft === '' && <div style={{ fontSize: 10, color: t3, marginTop: 4 }}>{t('research.count.none')}</div>}
        </div>

        <button onClick={() => setDraft(String(nextCount(draft === '' ? current : Number(draft))))}
          style={{ width: '100%', padding: '11px', borderRadius: 10, background: `${accent}18`, color: accent, border: `1px solid ${accent}55`, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>
          + {t('research.count.add')}
        </button>

        <label style={{ fontSize: 10, color: t3, display: 'block', marginBottom: 4 }}>{t('research.count.direct')}</label>
        <input type="number" min={0} value={draft} onChange={e => setDraft(e.target.value)}
          placeholder={String(current ?? 0)}
          style={invalid ? { ...inputStyle, borderColor: '#F87171' } : inputStyle} />

        <div style={{ fontSize: 10, color: t3, marginTop: 10, marginBottom: 18, lineHeight: 1.5 }}>{t('research.count.hint')}</div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={close} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>{t('research.common.cancel')}</button>
          <button onClick={save} disabled={invalid || saving || draft === ''}
            style={{ flex: 2, padding: '10px', borderRadius: 10, background: invalid || draft === '' ? `${accent}55` : accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: invalid || draft === '' ? 'not-allowed' : 'pointer' }}>
            {t('research.count.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
