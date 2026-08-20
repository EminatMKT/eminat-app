'use client'
import type { CSSProperties } from 'react'
import s from './index.module.css'

// Píldora de selección: el control que eligen "una de estas" sin desplegar nada — los
// trimestres del tablero, las vistas del Gantt. Es el mismo botón en los dos lados, así que
// vive acá y no en un módulo (ver arquitectura.md).
type Props = {
  label: string
  active: boolean
  onClick: () => void
  size?: 'sm' | 'md'
  color?: string // si la opción tiene un color con significado (el estado que filtra)
}

export default function PillToggle({ label, active, onClick, size = 'md', color }: Props) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={`${s.pill} ${active ? s.on : ''} ${size === 'sm' ? s.sm : ''} ${color ? s.tinted : ''}`}
      style={color ? ({ '--pill-color': color } as CSSProperties) : undefined}>
      {label}
    </button>
  )
}
