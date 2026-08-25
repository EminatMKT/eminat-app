'use client'
import type { ReactNode } from 'react'
import s from './index.module.css'

// Aviso de advertencia. Si recibe `children`, se vuelve desplegable y los muestra al abrirlo.
//
// Nació en el Gantt de Stratix ("N tareas no se muestran…" + la tabla de cuáles son) y vive
// acá porque nada en él sabe de tareas: recibe un texto y un detalle. Un número sin el "cuáles"
// deja al usuario con algo que no puede accionar, y ese problema no es de Stratix — le va a
// pasar a cualquier vista que filtre o descarte filas.
//
// El despliegue es <details> nativo: sin estado, sin efectos y accesible por teclado de fábrica.

type Props = {
  /** El aviso en sí. Ya traducido: este componente no llama a t(). */
  message: string
  /** El detalle. Si se omite, el aviso es una línea fija en vez de un desplegable. */
  children?: ReactNode
}

export default function WarningCallout({ message, children }: Props) {
  if (!children) return <div className={s.aviso} role="status">{message}</div>

  return (
    <details className={s.caja}>
      <summary className={s.aviso}>{message}</summary>
      <div className={s.detalle}>{children}</div>
    </details>
  )
}
