'use client'
import { RESEARCH_THEME, inputStyle } from '../../theme'
import type { LeadFieldDef } from '../../fields'

export default function LeadFormField({ def, value, onChange }: { def: LeadFieldDef; value: any; onChange: (v: any) => void }) {
  const { t3 } = RESEARCH_THEME
  const v = value ?? ''

  function control() {
    switch (def.type) {
      case 'select':
        return (
          <select value={v} onChange={e => onChange(e.target.value)} style={inputStyle}>
            <option value="">Select</option>
            {def.options?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )
      case 'datalist':
        return (
          <>
            <input list={`dl-${def.column}`} value={v} onChange={e => onChange(e.target.value)} style={inputStyle} />
            <datalist id={`dl-${def.column}`}>{def.options?.map(o => <option key={o} value={o} />)}</datalist>
          </>
        )
      case 'textarea':
        return <textarea value={v} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
      case 'checkbox':
        return <input type="checkbox" checked={value === true || value === 'true'} onChange={e => onChange(e.target.checked)} style={{ width: 18, height: 18, accentColor: RESEARCH_THEME.accent }} />
      default:
        return <input type={def.type} value={v} onChange={e => onChange(e.target.value)} style={inputStyle} />
    }
  }

  return (
    <div style={def.fullWidth ? { gridColumn: '1 / -1' } : undefined}>
      <label style={{ fontSize: 10, color: t3, display: 'block', marginBottom: 4 }}>
        {def.label}{def.required && <span style={{ color: '#F87171' }}> *</span>}
      </label>
      {control()}
    </div>
  )
}
