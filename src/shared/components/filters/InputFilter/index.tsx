'use client'
import type { FilterKind } from '@/shared/utils'
import s from './index.module.css'

type Props = {
  kind: Exclude<FilterKind, 'select'>
  value: string
  onChange: (value: string) => void
  label: string
  className?: string
}

// El control de filtro que es un `<input>`: el hermano de `SelectFilter`. Los dos dibujan una
// forma del mismo vocabulario, pero éste vivía a mano adentro del `.map()` de `FilterBar`,
// mientras el otro era un componente con su carpeta. Se extrajo el 04/09/2026, cuando la regla
// del `.map()` estrenó su detector y lo agarró.
//
// El rótulo va VISIBLE y no en el placeholder cuando es una fecha: el input date lo ignora y
// muestra dd/mm/aaaa, así que sin la etiqueta al lado no se sabe si es el desde o el hasta.
export default function InputFilter(props: Props) {
  const { kind, value, onChange, label, className } = props
  return (
    <label className={s.label}>
      {kind === 'date' && label}
      <input type={kind} value={value} placeholder={label} className={className}
        onChange={e => onChange(e.target.value)} />
    </label>
  )
}
