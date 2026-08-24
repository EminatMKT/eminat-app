'use client'
import type { CSSProperties } from 'react'
import type { FilterDef, FilterValues } from '@/shared/utils/filters'
import SelectFilter from '@/shared/components/ui/SelectFilter'

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
      {defs.map(d => d.kind && d.kind !== 'select' ? (
        // El input date ignora el placeholder (muestra dd/mm/aaaa), así que su label va visible.
        <label key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: mutedColor }}>
          {d.kind === 'date' && labelFor(d)}
          <input type={d.kind} value={values[d.key] ?? ''} placeholder={labelFor(d)}
            onChange={e => onChange(d.key, e.target.value)} style={selectStyle} />
        </label>
      ) : (
        <SelectFilter key={d.key} def={d} items={items} value={values[d.key] ?? ''}
          onChange={v => onChange(d.key, v)} label={labelFor(d)} style={selectStyle} />
      ))}
      {active && <button onClick={onClear} style={clearStyle}>✕ {clearLabel}</button>}
      <span style={{ fontSize: 11, color: mutedColor, marginLeft: 'auto' }}>{resultsLabel}</span>
    </div>
  )
}
