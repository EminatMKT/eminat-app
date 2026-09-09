'use client'
import type { FilterDef } from '@/shared/utils'

// centinela-exime: familia-dispersa@2 — ídem `InputFilter`: los dos controles del motor ya están
// juntos acá. El `DepartmentFilter` de directorio es el que falta, y lo trae la tarea 8.

type Props<T> = {
  def: FilterDef<T>
  items: T[]
  value: string
  onChange: (value: string) => void
  label: string
  className?: string
}

// centinela-exime: bloques-similares@3 — el otro `<select>` compartido es `CatalogoSelect`, y su
// propia marca ya firmó este par por el otro lado: allá las opciones son un catálogo fijo, acá
// salen de los DATOS presentes y arrastran la opción huérfana. Unificarlos no es "agregarle un
// prop" — habría que sacarle el `FilterDef` primero, que es la mitad de este archivo.

// Un <select> de la barra de filtros. Existe aparte por un caso concreto: las opciones se
// derivan de los datos presentes (sponsors, países), y como los filtros ahora se recuerdan entre
// sesiones, el valor guardado puede sobrevivir al dato que lo generó — se borra ese lead o se le
// cambia el sponsor. Sin la opción huérfana, el navegador dibuja el select vacío mientras el
// filtro SIGUE aplicándose: tabla en blanco y ningún control que lo explique.
export default function SelectFilter<T>(props: Props<T>) {
  const { def, items, value, onChange, label, className } = props
  const options = def.options?.(items) ?? []
  const orphan = value && !options.includes(value) ? value : null
  const labelOf = (v: string) => def.optionLabel?.(v) ?? v
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={className}>
      <option value="">{label}</option>
      {options.map(o => <option key={o} value={o}>{labelOf(o)}</option>)}
      {orphan && <option value={orphan}>{labelOf(orphan)}</option>}
    </select>
  )
}
