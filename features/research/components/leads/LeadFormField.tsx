'use client'
import { RESEARCH_THEME, inputStyle } from '../../theme'
import { useT, type I18nKey } from '@/shared/i18n'
import type { LeadFieldDef } from '../../fields'

export default function LeadFormField({ def, value, onChange, onBlur, hint, error }: { def: LeadFieldDef; value: any; onChange: (v: any) => void; onBlur?: () => void; hint?: React.ReactNode; error?: I18nKey }) {
  const { t3 } = RESEARCH_THEME
  const { t } = useT()
  const v = value ?? ''
  const style = error ? { ...inputStyle, borderColor: '#F87171' } : inputStyle

  function control() {
    switch (def.type) {
      case 'select':
        return (
          <select value={v} onChange={e => onChange(e.target.value)} style={style}>
            <option value="">{t('research.common.select')}</option>
            {def.options?.map(o => <option key={o} value={o}>{o}</option>)}
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
        return <input type={def.type} value={v} onChange={e => onChange(e.target.value)} onBlur={onBlur} style={style} />
    }
  }

  return (
    <div style={def.fullWidth ? { gridColumn: '1 / -1' } : undefined}>
      <label style={{ fontSize: 10, color: t3, display: 'block', marginBottom: 4 }}>
        {t(def.labelKey)}{def.required && <span style={{ color: '#F87171' }}> *</span>}
      </label>
      {control()}
      {error && <div style={{ fontSize: 10, marginTop: 3, color: '#F87171' }}>{t(error)}</div>}
      {hint && <div style={{ fontSize: 10, marginTop: 3 }}>{hint}</div>}
    </div>
  )
}
