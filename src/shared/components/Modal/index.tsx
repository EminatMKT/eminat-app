'use client'
import type { CSSProperties, ReactNode } from 'react'
import s from './index.module.css'

// Shell de cualquier modal: el fondo, la caja y —si se le pasa título— su encabezado con la X.
// Sin `title`, el contenido pone su propio encabezado (la ficha de actividad lleva chips arriba
// del título) y para eso recibe `onClose`, que es el mismo que cierra desde el fondo.
type Props = {
  title?: string
  width?: number
  onClose: () => void
  children: ReactNode
}

export default function Modal({ title, width = 480, onClose, children }: Props) {
  return (
    <div className={s.fondo} onClick={onClose}>
      <div className={s.caja} style={{ '--ancho': `${width}px` } as CSSProperties} onClick={e => e.stopPropagation()}>
        {title && (
          <div className={s.head}>
            <div className={s.titulo}>{title}</div>
            <button type="button" className={s.cerrar} onClick={onClose}>✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
