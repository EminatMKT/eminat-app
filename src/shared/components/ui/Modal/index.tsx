'use client'
import type { CSSProperties, ReactNode } from 'react'
import s from '@/shared/components/ui/Modal/index.module.css'

// Shell de cualquier modal: el fondo, la caja y —si se le pasa título— su encabezado con la X.
// El encabezado queda FIJO y solo scrollea el cuerpo: en un modal alto (la ficha de actividad,
// el formulario de tarea) el título y sus acciones tienen que seguir a la vista.
// `header` es para el contenido que arma su propio encabezado y necesita esa misma zona fija
// (la ficha lleva chips arriba del título y los botones de editar/borrar al lado); recibe
// `onClose` igual, que es el mismo que cierra desde el fondo.
type Props = {
  title?: string
  header?: ReactNode
  width?: number
  onClose: () => void
  children: ReactNode
}

export default function Modal({ title, header, width = 480, onClose, children }: Props) {
  return (
    <div className={s.fondo} onClick={onClose}>
      <div className={s.caja} style={{ '--ancho': `${width}px` } as CSSProperties} onClick={e => e.stopPropagation()}>
        {(title || header) && (
          <div className={s.head}>
            {header ?? (
              <div className={s.headFila}>
                <div className={s.titulo}>{title}</div>
                <button type="button" className={s.cerrar} onClick={onClose}>✕</button>
              </div>
            )}
          </div>
        )}
        <div className={s.cuerpo}>{children}</div>
      </div>
    </div>
  )
}
