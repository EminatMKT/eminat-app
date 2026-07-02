'use client'
import { RESEARCH_THEME, inputStyle } from '../../theme'
import { FIELD_LABELS, PIPELINE_COLS, FULL_WIDTH_FIELDS } from '../../constants'

export default function LeadFormField({ field, value, onChange }: { field: string; value: string; onChange: (v: string) => void }) {
  const { t3 } = RESEARCH_THEME
  return (
    <div style={FULL_WIDTH_FIELDS.has(field) ? { gridColumn: '1 / -1' } : undefined}>
      <label style={{ fontSize: 10, color: t3, display: 'block', marginBottom: 4 }}>{FIELD_LABELS[field]}</label>
      {field === 'stage' ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
          <option value="">Select</option>
          {PIPELINE_COLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : field === 'notes' || field === 'note' ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
      )}
    </div>
  )
}
