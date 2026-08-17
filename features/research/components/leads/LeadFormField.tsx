'use client'
import { RESEARCH_THEME, inputStyle } from '../../theme'
import { useT, type I18nKey } from '@/shared/i18n'
import type { LeadFieldDef } from '../../utils/fields'

export default function LeadFormField({ def, value, onChange, onBlur, hint, help, error, action }: { def: LeadFieldDef; value: any; onChange: (v: any) => void; onBlur?: () => void; hint?: React.ReactNode; help?: React.ReactNode; error?: I18nKey; action?: () => void }) {
  const { t3, accent } = RESEARCH_THEME
  const { t } = useT()
  const v = value ?? ''
  const style = error ? { ...inputStyle, borderColor: '#F87171' } : inputStyle

  function control() {
    // Campo de solo lectura: se muestra pero no se edita acá. Su escritura tiene una vía
    // dedicada con confirmación (el pop-up del contador), y `buildLeadPayload` lo excluye,
    // así que un input editable prometería un guardado que no ocurre.
    if (def.readOnly) {
      return (
        <input value={v === '' ? '—' : v} readOnly disabled
          style={{ ...style, background: 'rgba(128,128,128,.10)', color: t3, cursor: 'not-allowed' }} />
      )
    }
    switch (def.type) {
      case 'select':
        return (
          <select value={v} onChange={e => onChange(e.target.value)} style={style}>
            <option value="">{t('research.common.select')}</option>
            {def.options?.map(o => <option key={o} value={o}>{def.optionLabelKey?.[o] ? t(def.optionLabelKey[o]) : o}</option>)}
          </select>
        )
      case 'datalist':
        return (
          <>
            <input list={`dl-${def.column}`} value={v} onChange={e => onChange(e.target.value)} style={style} />
            <datalist id={`dl-${def.column}`}>{def.options?.map(o => <option key={o} value={o} />)}</datalist>
          </>
        )
      case 'textarea':
        return <textarea value={v} onChange={e => onChange(e.target.value)} style={{ ...style, minHeight: 60, resize: 'vertical' }} />
      case 'checkbox':
        return <input type="checkbox" checked={value === true || value === 'true'} onChange={e => onChange(e.target.checked)} style={{ width: 18, height: 18, accentColor: RESEARCH_THEME.accent }} />
      default:
        if (action) return (
          // Botón de búsqueda dentro del campo (autocompletado CT.gov, además del blur).
          <div style={{ position: 'relative' }}>
            <input type={def.type} value={v} onChange={e => onChange(e.target.value)} onBlur={onBlur} style={{ ...style, paddingRight: 36 }} />
            <button type="button" onClick={action} title={t('research.form.searchCT')} style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: accent, padding: 4, lineHeight: 1 }}>🔍</button>
          </div>
        )
        return <input type={def.type} value={v} onChange={e => onChange(e.target.value)} onBlur={onBlur} style={style} />
    }
  }

  return (
    <div style={def.fullWidth ? { gridColumn: '1 / -1' } : undefined}>
      <label style={{ fontSize: 10, color: t3, display: 'block', marginBottom: 4 }}>
        {t(def.labelKey)}{def.required && <span style={{ color: '#F87171' }}> *</span>}
      </label>
      {control()}
      {error
        ? <div style={{ fontSize: 10, marginTop: 3, color: '#F87171' }}>{t(error)}</div>
        : (hint || help) && <div style={{ fontSize: 10, marginTop: 3, color: t3 }}>{hint || help}</div>}
    </div>
  )
}
