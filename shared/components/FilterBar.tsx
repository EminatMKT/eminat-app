'use client'
import type { CSSProperties } from 'react'
import type { FilterDef, FilterValues } from '@/shared/lib/filters'

// Barra de filtros genérica, guiada por los defs. Theme-agnóstica: recibe estilos y labels
// ya resueltos (i18n) desde el módulo que la usa. Un <select> por def + Clear + contador.
export default function FilterBar<T>({ defs, items, values, onChange, onClear, labelFor, clearLabel, resultsLabel, selectStyle, clearStyle, mutedColor }: {
  defs: FilterDef<T>[]
  items: T[]
  values: FilterValues
  onChange: (key: string, value: string) => void
  onClear: () => void
  labelFor: (def: FilterDef<T>) => string
  clearLabel: string
  resultsLabel: string
  selectStyle?: CSSProperties
  clearStyle?: CSSProperties
  mutedColor?: string
}) {
  const active = defs.some(d => values[d.key])
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
      {defs.map(d => (
        <select key={d.key} value={values[d.key] ?? ''} onChange={e => onChange(d.key, e.target.value)} style={selectStyle}>
          <option value="">{labelFor(d)}</option>
          {d.options(items).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ))}
      {active && <button onClick={onClear} style={clearStyle}>✕ {clearLabel}</button>}
      <span style={{ fontSize: 11, color: mutedColor, marginLeft: 'auto' }}>{resultsLabel}</span>
    </div>
  )
}
