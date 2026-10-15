'use client'
import useFieldControl from '@/shared/components/ui/Field/useFieldControl'
import s from '@/shared/components/ui/PillToggle/index.module.css'

// Píldora de selección: el control que eligen "una de estas" sin desplegar nada — los
// trimestres del tablero, las vistas del Gantt. Es el mismo botón en los dos lados, así que
// vive acá y no en un módulo (ver arquitectura.md).
type Props = {
  label: string
  active: boolean
  // Sin esto no hay nada que elegir: se dibuja como un valor, no como un botón.
  onClick?: () => void
  size?: 'sm' | 'md'
  color?: string // si la opción tiene un color con significado (el estado que filtra)
  // Cuántos items caen en esta opción. Va apagado al lado del rótulo y no dentro de él: el
  // número contesta otra pregunta que el nombre, y pegados se leen como un nombre raro.
  count?: number
  diff?: boolean // resalta la píldora como distinta del otro lado de una comparación — cosmético
}

export default function PillToggle(props: Props) {
  const {
    label,
    active,
    onClick,
    size = 'md',
    color,
    count,
    diff,
  } = props
  // Inside a Field, its label names the switch (the id it points at); alone, this hands nothing.
  const named = useFieldControl()
  const className = `${s.pill} ${active ? s.on : ''} ${size === 'sm' ? s.sm : ''} ${color ? s.tinted : ''} ${diff ? s.diff : ''} ${onClick ? '' : s.estatico}`
  const style = color ? { '--pill-color': color } : undefined
  // Mismo elemento siempre, sólo cambia la etiqueta: sin `onClick` no hay nada que elegir, así
  // que se dibuja como un valor (`span`) en vez de un control (`button`). Atención: esto sólo
  // typechequea porque las dos ramas comparten exactamente los mismos atributos; un prop
  // propio de `<button>` (`disabled`, `type`, `form`, `name`) rompe esa unión y obliga a volver
  // a dos elementos separados — lo que `markup_dibujado` volvería a bloquear (ver el historial
  // en `.superpowers/sdd/2026-10-12-motor-duplicados-ambiente/task-12-report-v3.md`).
  const Tag = onClick ? 'button' : 'span'
  // Un `<button>` sin `type` hace submit si vive dentro de un `<form>`; cancelar el evento por
  // omisión evita eso sin necesitar el atributo `type`, que `<span>` no admite.
  const handleClick = onClick
    ? (e: { preventDefault: () => void }) => { e.preventDefault(); onClick() }
    : undefined
  return (
    <Tag
      {...(onClick ? named : undefined)}
      aria-pressed={onClick ? active : undefined}
      onClick={handleClick}
      className={className}
      style={style}
    >
      {label}{count !== undefined && <span className={s.cuenta}>{count}</span>}
    </Tag>
  )
}
