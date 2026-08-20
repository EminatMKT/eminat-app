'use client'
import type { CSSProperties } from 'react'
import s from './index.module.css'

// Un renglón de la leyenda del Gantt: la muestra de color y su rótulo.
// `finde` es el único renglón que no sale del catálogo de estados.
type Props = {
  label: string
  color?: string
  finde?: boolean
}

export default function EstadoLeyendaItem({ label, color, finde = false }: Props) {
  return (
    <div className={`${s.item} ${finde ? s.finde : ''}`} style={{ '--estado': color } as CSSProperties}>
      <div className={s.muestra} />
      {label}
    </div>
  )
}
