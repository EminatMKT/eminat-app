'use client'
import type { CSSProperties } from 'react'
import type { FilterDef } from '@/shared/lib/filters'

// Un <select> de la barra de filtros. Existe aparte por un caso concreto: las opciones se
// derivan de los datos presentes (sponsors, países), y como los filtros ahora se recuerdan entre
// sesiones, el valor guardado puede sobrevivir al dato que lo generó — se borra ese lead o se le
// cambia el sponsor. Sin la opción huérfana, el navegador dibuja el select vacío mientras el
// filtro SIGUE aplicándose: tabla en blanco y ningún control que lo explique.
export default function SelectFilter<T>({ def, items, value, onChange, label, style }: {
  def: FilterDef<T>
  items: T[]
  value: string
  onChange: (value: string) => void
  label: string
  style?: CSSProperties
}) {
  const options = def.options?.(items) ?? []
  const orphan = value && !options.includes(value) ? value : null
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={style}>
      <option value="">{label}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
      {orphan && <option value={orphan}>{orphan}</option>}
    </select>
  )
}
