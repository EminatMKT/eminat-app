'use client'
import type { ReactNode } from 'react'
import ModalHead from '@/shared/components/ui/ModalHead'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — no hay markup nuevo: el encabezado SALIÓ de acá a
// `ModalHead` y lo único que se agregó es el pie, que es un <div> con el `footer` adentro.
// Shell de cualquier modal: el fondo, la caja, su encabezado fijo y —si se le pasa— su pie fijo.
//
// El pie es la razón por la que este componente creció: en "Nueva tarea" los botones vivían
// dentro del cuerpo y quedaban abajo del scroll. Lo que decide si se guarda o se descarta tiene
// que estar siempre a la vista.
//
// `header` queda para el que arma el suyo y necesita esta misma zona fija — la ficha de
// actividad lleva chips arriba del título y sus acciones al lado.
type Props = {
  title?: string
  subtitle?: string
  header?: ReactNode
  /** Va en una zona FIJA bajo el cuerpo. Para las acciones del diálogo. */
  footer?: ReactNode
  /** Ancho en REM, no en píxeles: un modal fijo en px no crece cuando el usuario agranda la
   *  letra del navegador, así que el texto se apretuja contra los bordes. El nombre lleva la
   *  unidad para que nadie le pase 480 pensando en píxeles (rules/componentes.md). */
  anchoRem?: number
  onClose: () => void
  children: ReactNode
}

export default function Modal(props: Props) {
  // Siete props no entran en la firma sin volverla un párrafo: se desestructuran en la primera
  // línea del cuerpo (rules/codigo.md · "Un parámetro objeto se desestructura").
  const { title, subtitle, header, footer, anchoRem = 30, onClose, children } = props

  return (
    <div className={s.fondo} onClick={onClose}>
      <div className={s.caja} style={{ '--ancho': `${anchoRem}rem` }} onClick={e => e.stopPropagation()}>
        {(title || header) && (
          <div className={s.head}>
            {header ?? <ModalHead title={title} subtitle={subtitle} onClose={onClose} />}
          </div>
        )}
        <div className={s.cuerpo}>{children}</div>
        {footer && <div className={s.pie}>{footer}</div>}
      </div>
    </div>
  )
}
