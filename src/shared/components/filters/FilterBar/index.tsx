'use client'
import type { FilterDef, FilterValues } from '@/shared/utils'
import { Button } from '@/shared/components/ui'
import SelectFilter from '../SelectFilter'
import InputFilter from '../InputFilter'
import s from './index.module.css'

type Props<T> = {
  defs: FilterDef<T>[]
  items: T[]
  values: FilterValues
  onChange: (key: string, value: string) => void
  onClear: () => void
  labelFor: (def: FilterDef<T>) => string
}

// centinela-exime: bloques-similares@2 — la comparé declaración por declaración con
// `ListToolbar`, que es la otra fila de encabezado del repo: comparten `display:flex`,
// `flex-wrap`, `align-items` y el `margin-bottom`, y difieren en el gap y en TODO el contenido
// (aquélla lleva buscador y acción; ésta, un control por def). Son cuatro declaraciones: sacarlas
// a un módulo compartido cuesta más indirección de la que ahorra.

// Barra de filtros genérica, guiada por los defs: un control por def, más el Limpiar.
//
// NO recibe su look por props. Lo recibía —`selectStyle`, `clearStyle`, `mutedColor`— y los dos
// únicos consumidores le pasaban exactamente lo mismo, así que la configurabilidad no configuraba
// nada: sólo obligaba a cada módulo nuevo a conseguirse un tema de tablero para montarla.
//
// Tampoco recibe sus rótulos. `clearLabel` era la misma palabra en dos claves i18n y ahora sale
// de `Button kind="clear"`; `resultsLabel` lo pasaban VACÍO los dos —el conteo vive en la card
// del tablero de uno y en la cabecera de la tabla del otro—, así que era un `<span>` vacío.
export default function FilterBar<T>(props: Props<T>) {
  const { defs, items, values, onChange, onClear, labelFor } = props
  const active = defs.some(d => values[d.key])
  return (
    <div className={s.bar}>
      {defs.map(d => d.kind && d.kind !== 'select' ? (
        <InputFilter key={d.key} kind={d.kind} value={values[d.key] ?? ''} label={labelFor(d)}
          onChange={v => onChange(d.key, v)} className={s.control} />
      ) : (
        <SelectFilter key={d.key} def={d} items={items} value={values[d.key] ?? ''}
          onChange={v => onChange(d.key, v)} label={labelFor(d)} className={s.control} />
      ))}
      {active && <Button kind="clear" onClick={onClear} />}
    </div>
  )
}
