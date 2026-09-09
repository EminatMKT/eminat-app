'use client'
import type { ReactNode } from 'react'
import s from './index.module.css'

type Props = {
  abierto: boolean
  onAlternar: () => void
  /** El rótulo que acompaña al chevron. Sin él, el botón queda como ícono con caja propia. */
  children?: ReactNode
  /** Cómo se llama el control cuando no hay rótulo visible. */
  etiqueta?: string
  /** El `id` de lo que este botón despliega. */
  controla?: string
}

export default function Disclosure(props: Props) {
  const { abierto, onAlternar, children, etiqueta, controla } = props
  return (
    <button type="button" onClick={onAlternar} aria-expanded={abierto} aria-controls={controla}
      aria-label={children ? undefined : etiqueta}
      className={`${s.disparador}${children ? '' : ` ${s.soloIcono}`}`}>
      <span className={`${s.chevron}${abierto ? '' : ` ${s.cerrado}`}`}>▼</span>
      {children}
    </button>
  )
}

// El botón que abre y cierra algo: el chevron, su giro y el cableado de `aria-expanded` y
// `aria-controls`, una sola vez. Vivía copiado en la cabecera de `Panel` y en el control de
// detalle de `StatCard`, con el mismo ▼ girado 90° al cerrar — el gesto del módulo para «esto se
// despliega». `StatCard` todavía tiene su copia: se migra cuando se lo toque, que es cuando sus
// doce `style={}` caen también.
//
// La piel sale de si hay `children` y no de un prop de variante: con rótulo el blanco ES el
// rótulo y el botón es transparente; sin rótulo hace falta una caja, porque nadie apunta a un
// glifo de 10px. Dos formas, ninguna decisión en el punto de uso.
