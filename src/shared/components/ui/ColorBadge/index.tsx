import type { CSSProperties, ReactNode } from 'react'
import s from '@/shared/components/ui/ColorBadge/index.module.css'

// Etiqueta chica teñida con un color que viene de los datos. Reemplaza a `badgeStyle()`, que
// devolvía un objeto de estilos desde JS — un color de dominio no se dibuja en el JSX.
type Props = {
  color: string
  children: ReactNode
}

export default function ColorBadge({ color, children }: Props) {
  return <span className={s.badge} style={{ '--badge': color } as CSSProperties}>{children}</span>
}
