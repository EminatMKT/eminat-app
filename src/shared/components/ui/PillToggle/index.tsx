'use client'
import s from './index.module.css'

// Píldora de selección: el control que eligen "una de estas" sin desplegar nada — los
// trimestres del tablero, las vistas del Gantt. Es el mismo botón en los dos lados, así que
// vive acá y no en un módulo (ver arquitectura.md).
export default function PillToggle({ label, active, onClick, size = 'md' }: {
  label: string
  active: boolean
  onClick: () => void
  size?: 'sm' | 'md'
}) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={`${s.pill} ${active ? s.on : ''} ${size === 'sm' ? s.sm : ''}`}>
      {label}
    </button>
  )
}
