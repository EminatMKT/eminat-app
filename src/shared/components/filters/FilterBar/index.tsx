'use client'
import type { ReactNode } from 'react'
import type { FilterDef, FilterValues } from '@/shared/utils'
import { Button } from '@/shared/components/ui'
import SelectFilter from '../SelectFilter'
import InputFilter from '../InputFilter'
import s from './index.module.css'

// centinela-exime: bloques-similares@3 — comparada declaración por declaración con `ListToolbar`,
// la otra fila de encabezado: comparten cuatro (`display`, `flex-wrap`, `align-items`, margen) y
// difieren en el gap y en TODO el contenido. Sacarlas cuesta más indirección de la que ahorra.

// centinela-exime: familia-dispersa@2 — la familia `*bar` son ocho en seis directorios y son
// FORMAS, no un grupo: `GanttBar`, `StatsBar`, `TabBar`. El único parecido de verdad es el
// `FilterBar` de cobranzas, que sí hay que unificar y quedó anotado.

type Props<T> = {
  defs: FilterDef<T>[]
  items: T[]
  values: FilterValues
  onChange: (key: string, value: string) => void
  onClear: () => void
  labelFor: (def: FilterDef<T>) => string
  // Cómo se llama la columna. Va delante del `<select>` y no adentro: con un valor puesto, el
  // nativo muestra el VALOR —«Q2», «Ana Sinequipo»— y deja de decir de qué columna es. El
  // placeholder sólo lo dice mientras está vacío, que es justo cuando no hace falta.
  nameFor: (def: FilterDef<T>) => string
  // Lo que cierra la fila, después del Limpiar: hoy el «+ Filtro». Como children y no como tres
  // props: la barra no tiene por qué saber qué es esconder un filtro, sólo dónde va ese control.
  children?: ReactNode
  // Lo que abre la fila, antes de los controles: hoy las vistas guardadas. Va acá y no en un
  // contenedor aparte porque son la MISMA fila — dibujadas como bloques hermanos, las vistas
  // caían solas en el renglón de arriba y se leían como un rótulo.
  before?: ReactNode
}

export default function FilterBar<T>(props: Props<T>) {
  const { defs, items, values, onChange, onClear, labelFor, nameFor, children, before } = props
  const active = defs.some(d => values[d.key])
  // La clase la arma la barra: quien sabe si un filtro está puesto es ella, no el control.
  const claseDe = (v?: string) => `${s.control}${v ? ` ${s.activo}` : ''}`
  return (
    <div className={s.bar}>
      {before && <>{before}<span className={s.separador} /></>}
      {defs.map(d => d.kind && d.kind !== 'select' ? (
        // `InputFilter` pone su propio rótulo: una fecha lo necesita distinto en cada extremo
        // («Cargado desde», «Cargado hasta») y el nombre de la columna sería el mismo dos veces.
        <InputFilter key={d.key} kind={d.kind} value={values[d.key] ?? ''} label={labelFor(d)}
          onChange={v => onChange(d.key, v)} className={claseDe(values[d.key])} />
      ) : (
        <label key={d.key} className={s.campo}>
          <span className={s.rotulo}>{nameFor(d)}</span>
          <SelectFilter def={d} items={items} value={values[d.key] ?? ''}
            onChange={v => onChange(d.key, v)} label={labelFor(d)} className={claseDe(values[d.key])} />
        </label>
      ))}
      <div className={s.cola}>
        {active && <Button kind="clear" onClick={onClear} />}
        {children}
      </div>
    </div>
  )
}

// Barra de filtros genérica: un control por def, más el Limpiar. Ni su look ni sus rótulos entran
// por props — los dos consumidores pasaban lo mismo o pasaban vacío, así que no configuraban nada.
