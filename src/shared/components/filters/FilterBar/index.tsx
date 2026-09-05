'use client'
import type { ReactNode } from 'react'
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
  // Lo que cierra la fila, después del Limpiar: hoy el «+ Filtro». Como children y no como tres
  // props: la barra no tiene por qué saber qué es esconder un filtro, sólo dónde va ese control.
  children?: ReactNode
}

// centinela-exime: bloques-similares@2 — comparada declaración por declaración con `ListToolbar`,
// la otra fila de encabezado: comparten cuatro (`display`, `flex-wrap`, `align-items`, margen) y
// difieren en el gap y en TODO el contenido. Sacarlas cuesta más indirección de la que ahorra.

// centinela-exime: familia-dispersa@2 — la familia `*bar` son ocho en seis directorios y son
// FORMAS, no un grupo: `GanttBar`, `StatsBar`, `TabBar`. El único parecido de verdad es el
// `FilterBar` de cobranzas, que sí hay que unificar y quedó anotado.

// Barra de filtros genérica: un control por def, más el Limpiar. Ni su look ni sus rótulos entran
// por props — los dos consumidores pasaban lo mismo o pasaban vacío, así que no configuraban nada.
export default function FilterBar<T>(props: Props<T>) {
  const { defs, items, values, onChange, onClear, labelFor, children } = props
  const active = defs.some(d => values[d.key])
  // La clase la arma la barra: quien sabe si un filtro está puesto es ella, no el control.
  const claseDe = (v?: string) => `${s.control}${v ? ` ${s.activo}` : ''}`
  return (
    <div className={s.bar}>
      {defs.map(d => d.kind && d.kind !== 'select' ? (
        <InputFilter key={d.key} kind={d.kind} value={values[d.key] ?? ''} label={labelFor(d)}
          onChange={v => onChange(d.key, v)} className={claseDe(values[d.key])} />
      ) : (
        <SelectFilter key={d.key} def={d} items={items} value={values[d.key] ?? ''}
          onChange={v => onChange(d.key, v)} label={labelFor(d)} className={claseDe(values[d.key])} />
      ))}
      {active && <Button kind="clear" onClick={onClear} />}
      {children}
    </div>
  )
}
